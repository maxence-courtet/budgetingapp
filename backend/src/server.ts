import { errorHandler } from './middleware/asyncErrors'; // first: patches routers before routes load
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
import investmentRoutes from './routes/investments';
import habitRoutes from './routes/habits';
import fitnessRoutes from './routes/fitness';
import goalRoutes from './routes/goals';
import noteRoutes from './routes/notes';
import statsRoutes from './routes/stats';
import { runDataFixes } from './services/dataFixes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Public routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0' });
});

// Finance routes (existing)
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
  console.log(`Life Hub API running on http://0.0.0.0:${PORT}`);
});
