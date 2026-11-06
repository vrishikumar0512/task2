require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const { spawn } = require('child_process');

const isProduction = process.env.NODE_ENV === 'production';
const isCloudHosting = Boolean(
  isProduction ||
  process.env.RENDER ||
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.VERCEL ||
  process.env.HEROKU_APP_ID ||
  (process.env.PORT && process.env.PORT !== '3000')
);

const rawMongoUri = (process.env.MONGODB_URI || '').trim();
const isRemoteUri = Boolean(
  rawMongoUri &&
  (rawMongoUri.startsWith('mongodb+srv://') ||
   (!rawMongoUri.includes('127.0.0.1') && !rawMongoUri.includes('localhost')))
);

// In production or cloud hosting, do NOT fall back to local loopback
const MONGODB_URI = rawMongoUri || (isCloudHosting ? '' : 'mongodb://127.0.0.1:27017/shopease');

let isConnecting = false;
let reconnectTimer = null;
let mongodProcess = null;

// Helper: Mask credentials in MongoDB connection string for safe logging
function sanitizeMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}

// Helper: Try starting local MongoDB on local machine if disconnected (Windows local development only)
function startLocalMongoDB() {
  // STRICT REQUIREMENT: Never attempt to start a local MongoDB process in production, cloud hosts, or for remote clusters
  if (isProduction || isCloudHosting || isRemoteUri) {
    return false;
  }

  // Only run process spawning on Windows for local development
  if (process.platform !== 'win32') {
    return false;
  }

  const possibleMongodPaths = [
    process.env.MONGOD_PATH,
    'C:\\Users\\Pavithra\\mongodb\\MongoDB\\Server\\9.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\9.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe'
  ].filter(Boolean);

  const possibleDbPaths = [
    process.env.MONGO_DATA_PATH,
    'C:\\Users\\Pavithra\\mongodb\\data\\db',
    'C:\\data\\db'
  ].filter(Boolean);

  for (const mongodPath of possibleMongodPaths) {
    if (fs.existsSync(mongodPath)) {
      let dbPath = possibleDbPaths.find((p) => fs.existsSync(p));
      if (!dbPath && possibleDbPaths[0]) {
        dbPath = possibleDbPaths[0];
        try {
          fs.mkdirSync(dbPath, { recursive: true });
        } catch (e) {}
      }
      if (dbPath) {
        try {
          const proc = spawn(mongodPath, ['--dbpath', dbPath, '--bind_ip', '127.0.0.1'], {
            detached: true,
            stdio: 'ignore'
          });
          proc.unref();
          mongodProcess = proc;
          console.log(`Auto-started local MongoDB instance from ${mongodPath}`);
          return true;
        } catch (err) {
          console.error('Failed to auto-start MongoDB:', err.message);
        }
      }
    }
  }
  return false;
}

// Database Connection with Remote Support, Auto-Start Fallback (Local Only), and Auto-Reconnect
async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return true;
  }
  if (isConnecting) {
    return false;
  }

  isConnecting = true;

  // In production or when targeting a remote MongoDB cluster (e.g. Atlas):
  // ONLY connect to the configured MONGODB_URI and NEVER fallback to localhost
  if (isProduction || isCloudHosting) {
    if (!MONGODB_URI || !isRemoteUri) {
      console.error('[DATABASE CONFIG ERROR] Production / Cloud environment detected, but MONGODB_URI is not set to a remote MongoDB database (e.g., MongoDB Atlas mongodb+srv://...).');
      console.error('[DATABASE CONFIG ERROR] Localhost / 127.0.0.1 is not supported in production.');
      isConnecting = false;
      return false;
    }
  }

  const urisToTry = (isProduction || isCloudHosting || isRemoteUri)
    ? [MONGODB_URI].filter(Boolean)
    : [
        MONGODB_URI,
        MONGODB_URI.includes('localhost') ? MONGODB_URI.replace('localhost', '127.0.0.1') : null,
        'mongodb://127.0.0.1:27017/shopease'
      ].filter(Boolean);

  const uniqueUris = [...new Set(urisToTry)];
  let lastConnectError = null;

  for (const uri of uniqueUris) {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect().catch(() => {});
      }
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`MongoDB connected successfully to ${sanitizeMongoUri(uri)}`);
      isConnecting = false;
      return true;
    } catch (err) {
      lastConnectError = err;
      console.warn(`Connection attempt failed for ${sanitizeMongoUri(uri)}: ${err.message}`);
    }
  }

  // Handle failure for remote / production deployment
  if (isProduction || isCloudHosting || isRemoteUri) {
    console.error(`[DATABASE ERROR] Unable to connect to remote MongoDB: ${lastConnectError ? lastConnectError.message : 'Unknown error'}`);
    console.error('[DATABASE TROUBLESHOOTING]:');
    console.error(' 1. Check MongoDB Atlas -> Network Access: Ensure 0.0.0.0/0 (allow access from anywhere) is configured.');
    console.error(' 2. Check Database Access: Verify username, password, and database privileges.');
    console.error(' 3. Check MONGODB_URI in your cloud host environment variables.');
  } else {
    // Local developer environment: attempt starting local MongoDB service
    console.log('MongoDB connection failed on configured URIs. Attempting to start local MongoDB...');
    startLocalMongoDB();
  }

  // Retry after short delay
  clearTimeout(reconnectTimer);
  const retryDelay = isProduction || isRemoteUri ? 5000 : 2000;
  reconnectTimer = setTimeout(() => {
    isConnecting = false;
    connectToDatabase();
  }, retryDelay);

  return false;
}

// Reconnect event listeners
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Scheduling auto-reconnect...');
  clearTimeout(reconnectTimer);
  const retryDelay = isProduction || isRemoteUri ? 5000 : 2000;
  reconnectTimer = setTimeout(() => {
    connectToDatabase();
  }, retryDelay);
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
});

// Helper for routes to await connection before responding with an error
async function ensureDbConnected(timeoutMs = 4000) {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (mongoose.connection.readyState === 0) {
    connectToDatabase();
  }

  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (mongoose.connection.readyState === 1) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  return mongoose.connection.readyState === 1;
}

module.exports = {
  connectToDatabase,
  ensureDbConnected,
  startLocalMongoDB,
  sanitizeMongoUri
};
