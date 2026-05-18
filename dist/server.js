"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const subdomainRouter_1 = require("./middleware/subdomainRouter");
const dataIsolation_1 = require("./middleware/dataIsolation");
const adminAuth_1 = require("./middleware/adminAuth");
const clients_1 = __importDefault(require("./routes/admin/clients"));
const users_1 = __importDefault(require("./routes/admin/users"));
const dashboard_1 = __importDefault(require("./routes/admin/dashboard"));
const deletion_requests_1 = __importDefault(require("./routes/admin/deletion-requests"));
const audit_1 = __importDefault(require("./routes/admin/audit"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
const auth_1 = __importDefault(require("./routes/auth"));
const buildings_1 = __importDefault(require("./routes/buildings"));
const invitations_1 = __importDefault(require("./routes/invitations"));
// Load environment variables
dotenv_1.default.config();
// Initialize Express
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
// Parse JSON FIRST (before routes!)
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Then subdomain routing & multi-tenant
app.use(subdomainRouter_1.subdomainRouter);
app.use(subdomainRouter_1.devClientContext);
app.use(dataIsolation_1.attachQueryBuilder);
// Admin routes with authentication (Phase 2+)
app.use('/admin/clients', clients_1.default);
app.use('/admin/users', users_1.default); // Note: includes login endpoint
app.use('/admin/dashboard', adminAuth_1.adminAuthMiddleware, dashboard_1.default);
app.use('/admin/deletion-requests', adminAuth_1.adminAuthMiddleware, deletion_requests_1.default);
app.use('/admin/audit', adminAuth_1.adminAuthMiddleware, audit_1.default);
// Tenant routes
app.use('/auth', auth_1.default);
app.use('/invitations', invitations_1.default);
app.use('/buildings', buildings_1.default);
// Health Check Endpoints
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
app.get('/health/db', async (_req, res) => {
    try {
        await db_1.prisma.$queryRaw `SELECT 1`;
        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// Root endpoint
app.get('/', (_req, res) => {
    res.json({
        message: 'Building Management System API',
        version: '0.1.0',
        status: 'running',
        documentation: '/api/docs',
    });
});
// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.path,
        method: req.method,
    });
});
// Error Handler
app.use((err, _req, res, _next) => {
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
        await db_1.prisma.$queryRaw `SELECT 1`;
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
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Graceful Shutdown (handled in db.ts, but keep for clarity)
process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await db_1.prisma.$disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\nShutting down gracefully...');
    await db_1.prisma.$disconnect();
    process.exit(0);
});
// Start the server
startServer();
exports.default = app;
//# sourceMappingURL=server.js.map