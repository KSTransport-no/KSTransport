// IMPORTANT: Import Sentry instrumentation FIRST, before any other imports
require('./instrument.js');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const Sentry = require('@sentry/node');
const logger = require('./utils/logger');
const { handleError } = require('./utils/errorHandler');
const { sanitizeMiddleware } = require('./utils/sanitize');
const pool = require('./config/database');
const cache = require('./utils/cache');
require('dotenv').config({ path: ['.env', '../.env'] });

// Importer routes
const authRoutes = require('./routes/auth');
const skiftRoutes = require('./routes/skift');
const avvikRoutes = require('./routes/avvik');
const forbedringsforslagRoutes = require('./routes/forbedringsforslag');
const dataRoutes = require('./routes/data');
const adminRoutes = require('./routes/admin');
const crudRoutes = require('./routes/crud');
const uploadRoutes = require('./routes/upload');
const infoRoutes = require('./routes/info');
const trafikkRoutes = require('./routes/trafikk');
const værRoutes = require('./routes/vær');
const varslingerRoutes = require('./routes/varslinger');

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutter
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Høyere grense i utvikling
  message: { feil: 'For mange forespørsler, prøv igjen senere' },
  standardHeaders: true,
  legacyHeaders: false
});

// Sentry express integration is configured via Sentry.expressIntegration() in instrument.js
// Error handling is hooked after route setup via setupExpressErrorHandler

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://*.sentry.io", "https://*.ingest.de.sentry.io"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for image loading from uploads
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeMiddleware); // Sanitize all input

// Request logging
if (process.env.NODE_ENV === 'production') {
  // Structured JSON logs in production
  morgan.token('user-id', (req) => req.sjåfør?.id || '-');
  app.use(morgan(JSON.stringify({
    method: ':method',
    url: ':url',
    status: ':status',
    responseTime: ':response-time ms',
    contentLength: ':res[content-length]',
    userAgent: ':user-agent',
    ip: ':remote-addr',
    userId: ':user-id'
  }), {
    skip: (req) => req.url.startsWith('/health'),
  }));
} else {
  app.use(morgan('dev', {
    skip: (req) => req.url.startsWith('/health'),
  }));
}

// Liveness probe – lightweight, no dependency checks
app.get('/health/live', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Readiness probe – checks DB connectivity, cache stats, memory
app.get('/health/ready', async (req, res) => {
  const checks = {};
  let healthy = true;

  // Database check
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    checks.database = { status: 'OK', responseTime: `${Date.now() - start}ms` };
  } catch (err) {
    checks.database = { status: 'ERROR', message: err.message };
    healthy = false;
  }

  // Cache stats
  checks.cache = cache.getStats();

  // Process info
  const mem = process.memoryUsage();
  checks.process = {
    uptime: `${Math.floor(process.uptime())}s`,
    memoryRSS: `${Math.round(mem.rss / 1024 / 1024)}MB`,
    memoryHeap: `${Math.round(mem.heapUsed / 1024 / 1024)}/${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
  };

  checks.environment = process.env.NODE_ENV;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Backward-compatible alias
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), environment: process.env.NODE_ENV });
});

// Reset rate limiting for development
if (process.env.NODE_ENV === 'development') {
  app.post('/reset-rate-limit', (req, res) => {
    // Reset rate limiting for the current IP
    limiter.resetKey(req.ip);
    res.json({ message: 'Rate limiting reset for IP: ' + req.ip });
  });
}

// Swagger API documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
app.use('/api-docs',
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://validator.swagger.io"],
    },
  }),
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'KS Transport API Docs',
  })
);
// Serve raw spec as JSON
app.get('/api-docs.json', (req, res) => {
  res.json(swaggerSpec);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/skift', skiftRoutes);
app.use('/api/avvik', avvikRoutes);
app.use('/api/forbedringsforslag', forbedringsforslagRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/crud', crudRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/info', infoRoutes);
app.use('/api/trafikk', trafikkRoutes);
app.use('/api/weather', værRoutes);
app.use('/api/varslinger', varslingerRoutes);

// Test-rute for å sjekke om serveren fungerer
app.get('/test', (req, res) => {
  res.json({ melding: 'Server fungerer!' });
});

// Direkte rute for avvik-bilder (må være før 404-handleren)
app.get('/uploads/avvik/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(__dirname, 'uploads', 'avvik', filename);
  
  // Prevent path traversal
  const avvikUploadsDir = path.join(__dirname, 'uploads', 'avvik');
  if (!filePath.startsWith(avvikUploadsDir)) {
    return res.status(400).json({ feil: 'Ugyldig filnavn' });
  }
  
  const fs = require('fs');
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    res.sendFile(filePath);
  } else {
    res.status(404).json({ feil: 'Bilde ikke funnet' });
  }
});

// Serve statiske filer direkte med cache headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1y', // Cache i 1 år
  etag: true,
  lastModified: true
}));

// Sentry error handler must be after all routes but before other error handlers
Sentry.setupExpressErrorHandler(app);

// Global error handler (falls through from Sentry)
app.use((error, req, res, next) => {
  handleError(error, req, res, 'Global error handler');
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ feil: 'Endepunkt ikke funnet' });
});

// Håndter unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (Sentry) {
    Sentry.captureException(reason);
  }
  // Ikke krasj serveren, bare logg feilen
});

// Håndter uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  if (Sentry) {
    Sentry.captureException(error);
  }
  // La serveren fortsette å kjøre hvis mulig
  // I produksjon bør du vurdere å restarte serveren
});

// Start server
app.listen(PORT, () => {
  logger.log(`🚛 KS Transport API server kjører på port ${PORT}`);
  logger.log(`🌍 Miljø: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
