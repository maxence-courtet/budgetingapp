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

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Every request acts as one signed-in user: the web app and the hosted MCP server both send a short-lived
  // JWT signed by the frontend. There is no shared or service token.
  const authHeader = req.headers.authorization;
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
