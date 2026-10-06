import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import prisma from '../services/prisma';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Better Auth runs in the frontend and signs short-lived JWTs; its public keys are served at /api/auth/jwks.
const authUrl = (process.env.BETTER_AUTH_URL ?? '').replace(/\/$/, '');
const jwks = authUrl ? createRemoteJWKSet(new URL(`${authUrl}/api/auth/jwks`)) : null;

interface AuthPayload extends JWTPayload {
  email?: string;
  emailVerified?: boolean;
  name?: string;
}

async function verifyToken(token: string): Promise<AuthPayload> {
  if (!jwks) throw new Error('BETTER_AUTH_URL is not configured');
  const { payload } = await jwtVerify(token, jwks, { issuer: authUrl, audience: authUrl });
  return payload as AuthPayload;
}

async function findOrCreateUser(payload: AuthPayload) {
  const authId = payload.sub!;
  const existing = await prisma.user.findUnique({ where: { authId } });
  if (existing) return existing;

  // First sign-in after the move off Auth0: adopt the Auth0-era account with the same email.
  // Only for verified emails, otherwise anyone could sign up with someone else's address.
  if (payload.email && payload.emailVerified === true) {
    const legacy = await prisma.user.findFirst({
      where: { email: payload.email, authId: { startsWith: 'auth0|' } },
    });
    if (legacy) {
      return prisma.user.update({ where: { id: legacy.id }, data: { authId } });
    }
  }

  return prisma.user.upsert({
    where: { authId },
    update: {},
    create: { authId, email: payload.email || '', name: payload.name || 'User' },
  });
}

async function attachServiceUser(req: Request, res: Response, next: NextFunction) {
  try {
    // MCP service token: look up or create a designated service user
    const serviceUser = await prisma.user.upsert({
      where: { authId: 'service|mcp' },
      update: {},
      create: {
        authId: 'service|mcp',
        email: 'mcp@life-hub.internal',
        name: 'MCP Service',
      },
    });
    req.userId = serviceUser.id;
    next();
  } catch (error) {
    console.error('Error attaching service user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const serviceToken = process.env.SERVICE_TOKEN;

  // Allow service token to bypass user JWT validation
  if (serviceToken && authHeader === `Bearer ${serviceToken}`) {
    return attachServiceUser(req, res, next);
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let payload: AuthPayload;
  try {
    payload = await verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  if (!payload.sub) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await findOrCreateUser(payload);
    req.userId = user.id;
    next();
  } catch (error) {
    console.error('Error attaching user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
