import { errorHandler } from './middleware/asyncErrors'; // first: patches routers before routes load
import express from 'express';
import cors from 'cors';
import { rateLimit } from './middleware/rateLimit';
import { authMiddleware } from './middleware/auth';
import { accountRoutes } from './routes/accounts';
import { categoryRoutes } from './routes/categories';
import { transactionRoutes } from './routes/transactions';
import { budgetRoutes } from './routes/budgets';
import { monthRoutes } from './routes/months';
import { reportRoutes } from './routes/reports';
import { searchRoutes } from './routes/search';
import investmentRoutes from './routes/investments';
import habitRoutes from './routes/habits';
import fitnessRoutes from './routes/fitness';
import goalRoutes from './routes/goals';
import noteRoutes from './routes/notes';
import statsRoutes from './routes/stats';
import meRoutes from './routes/me';
import { runDataFixes } from './services/dataFixes';

const app = express();
const PORT = process.env.PORT || 3001;

// Behind Railway's proxy: req.ip is the client, not the proxy.
app.set('trust proxy', 1);

// CORS_ORIGIN: comma-separated allowed origins (e.g. https://lifehub.example.com). Unset = allow all (local dev).
const allowedOrigins = (process.env.CORS_ORIGIN ?? '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : undefined));
app.use(express.json({ limit: '1mb' }));
// RATE_LIMIT_PER_MINUTE requests per client IP (default 300; the dashboard makes ~10 per load).
app.use('/api', rateLimit({ windowMs: 60_000, max: Number(process.env.RATE_LIMIT_PER_MINUTE) || 300 }));

// Public routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0' });
});

// Finance routes (existing)
app.use('/api/me', authMiddleware, meRoutes);
app.use('/api/accounts', authMiddleware, accountRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/budgets', authMiddleware, budgetRoutes);
app.use('/api/months', authMiddleware, monthRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/search', authMiddleware, searchRoutes);

// New routes
app.use('/api/investments', investmentRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/fitness', fitnessRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/stats', statsRoutes);

app.use(errorHandler);

runDataFixes();

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Hive API running on http://0.0.0.0:${PORT}`);
});
