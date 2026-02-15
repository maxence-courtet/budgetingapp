import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import { accountRoutes } from './routes/accounts';
import { categoryRoutes } from './routes/categories';
import { transactionRoutes } from './routes/transactions';
import { budgetRoutes } from './routes/budgets';
import { monthRoutes } from './routes/months';
import { reportRoutes } from './routes/reports';
import { searchRoutes } from './routes/search';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Public routes (no auth required)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Protected routes (auth required)
app.use('/api/accounts', authMiddleware, accountRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/budgets', authMiddleware, budgetRoutes);
app.use('/api/months', authMiddleware, monthRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/search', authMiddleware, searchRoutes);

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Budget API running on http://0.0.0.0:${PORT}`);
});
