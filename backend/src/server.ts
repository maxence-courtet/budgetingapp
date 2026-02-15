import express from 'express';
import cors from 'cors';
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

app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/months', monthRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/search', searchRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Budget API running on http://0.0.0.0:${PORT}`);
});
