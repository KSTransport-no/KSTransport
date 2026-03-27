const { Pool } = require('pg');
const logger = require('../utils/logger');

// Optimaliserte connection pool innstillinger
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // Connection pool optimalisering
  max: parseInt(process.env.DB_POOL_MAX) || 20, // Maks antall klienter i poolen
  min: parseInt(process.env.DB_POOL_MIN) || 5, // Minimum antall klienter i poolen
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000, // Lukk idle klienter etter 30 sekunder
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT) || 2000, // Timeout for å få en connection
  // Statement timeout (forhindrer lange queries)
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000, // 30 sekunder
  // Query timeout
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000, // 30 sekunder
});

// Test database connection
pool.on('connect', () => {
  logger.info('Tilkoblet til PostgreSQL database');
});

pool.on('error', (err) => {
  logger.error('Database pool feil:', err);
  // Ikke krasj applikasjonen, bare logg feilen
  // Connection pool vil prøve å gjenopprette tilkoblingen automatisk
});

// Test database connection ved oppstart
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info('Database connection test successful');
  } catch (error) {
    logger.error('Database connection test failed:', error);
    // Ikke krasj applikasjonen, bare logg feilen
    // Serveren vil fortsette å kjøre, men queries vil feile
  }
}

// Test connection etter kort delay for å gi database tid til å starte
setTimeout(() => {
  testConnection();
}, 2000);

module.exports = pool;
