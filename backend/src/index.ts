import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { projectsRouter } from './routes/projects';
import { githubRouter } from './routes/github';
import { scannerRouter } from './routes/scanner';
import { architectureRouter } from './routes/architecture';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check — no auth required
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vibeboard-backend' });
});

// API routes — all protected by github-auth middleware
app.use('/projects', projectsRouter);
app.use('/github', githubRouter);
app.use('/scan', scannerRouter);
app.use('/architecture', architectureRouter);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[VibeBoard] Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[VibeBoard] Backend running on http://localhost:${PORT}`);
});
