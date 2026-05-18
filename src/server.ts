import { subdomainRouter, devClientContext } from './middleware/subdomainRouter';
import { attachQueryBuilder } from './middleware/dataIsolation';
import { adminAuthMiddleware } from './middleware/adminAuth';
import adminClientsRouter from './routes/admin/clients';
import adminUsersRouter from './routes/admin/users';
import adminDashboardRouter from './routes/admin/dashboard';
import adminDeletionRequestsRouter from './routes/admin/deletion-requests';
import adminAuditRouter from './routes/admin/audit';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { prisma } from './db';
import authRoutes from './routes/auth';
import buildingRoutes from './routes/buildings';
import invitationRoutes from './routes/invitations';

// Load environment variables
dotenv.config();

// Initialize Express
const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Parse JSON FIRST (before routes!)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Then subdomain routing & multi-tenant
app.use(subdomainRouter);
app.use(devClientContext);
app.use(attachQueryBuilder);

// Admin routes with authentication (Phase 2+)
app.use('/admin/clients', adminClientsRouter);
app.use('/admin/users', adminUsersRouter);  // Note: includes login endpoint
app.use('/admin/dashboard', adminAuthMiddleware, adminDashboardRouter);
app.use('/admin/deletion-requests', adminAuthMiddleware, adminDeletionRequestsRouter);
app.use('/admin/audit', adminAuthMiddleware, adminAuditRouter);

// Tenant routes
app.use('/auth', authRoutes);
app.use('/invitations', invitationRoutes);
app.use('/buildings', buildingRoutes);

// Health Check Endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/health/db', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Building Management System API',
    version: '0.1.0',
    status: 'running',
    documentation: '/api/docs',
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// Start Server
const startServer = async () => {
  try {
    // Verify database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Database connection successful');

    // Start listening
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════╗
║  Building Management System API            ║
║  Server running on port ${PORT}             ║
║  Environment: ${process.env.NODE_ENV || 'development'}      ║
║  Database: Connected                       ║
╚════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful Shutdown (handled in db.ts, but keep for clarity)
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
startServer();

export default app;
