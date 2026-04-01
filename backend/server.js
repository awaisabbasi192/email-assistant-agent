import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware.js';
import { generalApiLimiter } from './middleware/rateLimiter.middleware.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import gmailRoutes from './routes/gmail.routes.js';
import aiRoutes from './routes/ai.routes.js';
import adminRoutes from './routes/admin.routes.js';

// Import services
import StorageService from './services/storageService.js';
import AuthService from './services/authService.js';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Log startup info
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  TEST_MODE: process.env.TEST_MODE || 'disabled',
  PORT: PORT
});

// Trust proxy (for Railway and other reverse proxies)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting for general endpoints
app.use('/api/', generalApiLimiter);

// Initialize admin account on startup
async function initializeAdminAccount() {
  try {
    console.log('🔄 Initializing admin account...');
    const data = await StorageService.read('users.json');
    console.log('📊 Current users:', data.users.length);

    const adminExists = data.users.some(u => u.role === 'admin');
    console.log('👤 Admin exists:', adminExists);

    if (!adminExists) {
      const adminEmail = 'admin@example.com';
      const adminPassword = 'Admin@123';
      console.log('🔐 Creating admin account:', adminEmail);

      const passwordHash = await AuthService.hashPassword(adminPassword);

      const adminUser = {
        id: `user_${Date.now()}`,
        email: adminEmail,
        passwordHash,
        role: 'admin',
        createdAt: new Date().toISOString(),
        gmailConnected: false,
        settings: {
          autoGenerateReplies: false,
          replyTone: 'professional'
        }
      };

      await StorageService.append('users.json', adminUser);
      console.log('✅ Admin account created:', adminEmail);
    } else {
      console.log('✅ Admin account already exists');
    }
  } catch (error) {
    console.error('❌ Failed to initialize admin account:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Initialize on startup
await initializeAdminAccount();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Init endpoint - manual initialization trigger
app.post('/api/init', async (req, res) => {
  try {
    await initializeAdminAccount();
    res.json({
      message: 'Initialization completed',
      credentials: {
        email: 'admin@example.com',
        password: 'Admin@123'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Email Assistant Server               ║
║   Running on port ${PORT}                  ║
║   Environment: ${process.env.NODE_ENV || 'development'}        ║
╚════════════════════════════════════════╝
  `);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
