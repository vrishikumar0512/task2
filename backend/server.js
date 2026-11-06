require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const { connectToDatabase, ensureDbConnected } = require('./db');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

// CORS Configuration: Supports public frontend hosting (Netlify, Vercel, GitHub Pages, etc.)
// Configurable via ALLOWED_ORIGINS (comma-separated) or FRONTEND_URL environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim().replace(/\/+$/, ''))
  : (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim().replace(/\/+$/, '')] : ['*']);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes('*')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes(origin.replace(/\/+$/, '')))) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Non-browser request, curl, or same-origin
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, access-control-request-private-network');
  res.header('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(express.json());

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);

// Test & Health Verification Endpoints
const healthHandler = (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const statusCode = isDbConnected ? 200 : 503;
  res.status(statusCode).json({
    status: isDbConnected ? 'healthy' : 'degraded',
    message: 'ShopEase backend is running successfully',
    database: isDbConnected ? 'connected' : 'disconnected',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
};

app.get('/api/test', healthHandler);
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Serve frontend static assets (enables unified single-service full-stack deployment)
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Clean route handling for frontend navigation without requiring .html extension
const pageRoutes = {
  '/': 'index.html',
  '/products': 'index.html',
  '/product-details': 'product-details.html',
  '/cart': 'cart.html',
  '/checkout': 'checkout.html',
  '/login': 'login.html',
  '/register': 'register.html',
  '/orders': 'orders.html',
  '/order-success': 'order-success.html'
};

Object.entries(pageRoutes).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(frontendPath, file));
  });
});

// 404 Route Handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    message: 'API route not found'
  });
});

// Fallback to index.html for unmatched browser navigation
app.use((req, res) => {
  if (req.accepts('html')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).json({
      message: 'Route not found'
    });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    message: 'Internal server error'
  });
});

// Process-level unhandled exception and rejection protection to prevent unexpected exit
process.on('uncaughtException', (err) => {
  console.error('Unhandled process exception caught gracefully:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection caught gracefully:', reason);
});

// Graceful shutdown handling for container and cloud deployments (Render, Railway, Fly.io)
function handleGracefulShutdown(signal) {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.log('HTTP server closed.');
    mongoose.connection.close(false).then(() => {
      console.log('MongoDB connection closed cleanly.');
      process.exit(0);
    }).catch(() => {
      process.exit(0);
    });
  });

  // Force shutdown after timeout if pending operations hang
  setTimeout(() => {
    console.warn('Forcing immediate shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

// Initialize database connection
connectToDatabase();

// Start Server listening on platform-assigned PORT across all IPv4 interfaces (0.0.0.0)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`ShopEase backend running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[PORT NOTICE] Port ${PORT} is already in use by an existing process.`);
    console.warn(`If an active ShopEase instance is already running on port ${PORT}, it will continue handling requests.`);
    console.warn(`To terminate and restart freshly, stop the existing process holding port ${PORT}.`);
  } else {
    console.error('Server listener error:', err.message);
  }
});

module.exports = { app, server };
