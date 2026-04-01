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

console.log('🚀 Starting Email Assistant Server...');
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: PORT
});

// Security middleware
app.use(helmet());

// Trust proxy - required for rate limiting behind proxies (Railway)
app.set('trust proxy', 1);

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:3000',
      'https://email-assistant-agent-8ueg.vercel.app',
      'https://email-assistant-agent-8ueg-awais-madnis-projects.vercel.app'
    ];

    // Allow if exact match OR if it's a Vercel preview domain
    const isVercelDomain = origin && origin.includes('email-assistant-agent') && origin.includes('vercel.app');

    if (!origin || allowedOrigins.includes(origin) || isVercelDomain) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Initialize admin account function
async function initializeAdminAccount() {
  try {
    console.log('🔄 Checking admin account...');
    const data = await StorageService.read('users.json');
    const adminExists = data.users && data.users.some(u => u.role === 'admin');

    if (!adminExists) {
      console.log('📝 Creating admin account...');
      const adminEmail = 'admin@example.com';
      const adminPassword = 'Admin@123';
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
      console.log('✅ Admin account created successfully!');
      console.log('   Email: admin@example.com');
      console.log('   Password: Admin@123');
    } else {
      console.log('✅ Admin account already exists');
    }
  } catch (error) {
    console.error('❌ Error initializing admin:', error.message);
  }
}

// Initialize admin on startup
await initializeAdminAccount();

// Health check endpoint (NO RATE LIMIT)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Apply rate limiting to /api/* (but NOT /api/health or /api/auth/login initially)
app.use('/api/', (req, res, next) => {
  // Skip rate limiting for health checks and init
  if (req.path === '/health' || req.path === '/init') {
    return next();
  }
  generalApiLimiter(req, res, next);
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
  console.log(`✅ API: http://localhost:${PORT}/api`);
  console.log(`✅ Health: http://localhost:${PORT}/api/health`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;
