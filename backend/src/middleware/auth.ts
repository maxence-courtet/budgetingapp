import { Request, Response, NextFunction } from 'express';
import { auth } from 'express-oauth2-jwt-bearer';
import prisma from '../services/prisma';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const jwtCheck = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
});

async function attachUserId(req: Request, res: Response, next: NextFunction) {
  try {
    const auth0Id = req.auth?.payload.sub;
    if (!auth0Id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.upsert({
      where: { auth0Id },
      update: {},
      create: {
        auth0Id,
        email: (req.auth?.payload as any).email || '',
        name: (req.auth?.payload as any).name || 'User',
      },
    });

    req.userId = user.id;
    next();
  } catch (error) {
    console.error('Error attaching user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  jwtCheck(req, res, (err) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    attachUserId(req, res, next);
  });
}
