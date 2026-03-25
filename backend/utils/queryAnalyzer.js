/**
 * Query analyzer utility for å finne trege queries
 * Bruker EXPLAIN ANALYZE for å analysere query performance
 */

const pool = require('../config/database');
const logger = require('./logger');

/**
 * Analyser en query med EXPLAIN ANALYZE
 * @param {string} query - SQL query å analysere
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} - Analyse resultat
 */
const analyzeQuery = async (query, params = []) => {
  try {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON) ${query}`;
    const result = await pool.query(explainQuery, params);
    
    if (result.rows && result.rows[0] && result.rows[0]['QUERY PLAN']) {
      const plan = result.rows[0]['QUERY PLAN'][0];
      
      return {
        query: query,
        executionTime: plan['Execution Time'],
        planningTime: plan['Planning Time'],
        totalTime: plan['Planning Time'] + plan['Execution Time'],
        plan: plan
      };
    }
    
    return null;
  } catch (error) {
    logger.error('Feil ved query analyse:', error);
    throw error;
  }
};

/**
 * Sjekk om en query bruker indekser
 * @param {string} query - SQL query å sjekke
 * @param {Array} params - Query parameters
 * @returns {Promise<boolean>} - true hvis indekser brukes
 */
const usesIndexes = async (query, params = []) => {
  try {
    const explainQuery = `EXPLAIN (FORMAT JSON) ${query}`;
    const result = await pool.query(explainQuery, params);
    
    if (result.rows && result.rows[0] && result.rows[0]['QUERY PLAN']) {
      const plan = result.rows[0]['QUERY PLAN'][0];
      
      // Rekursivt søk etter Index Scan eller Index Only Scan
      const hasIndexScan = (node) => {
        if (node['Node Type'] === 'Index Scan' || node['Node Type'] === 'Index Only Scan') {
          return true;
        }
        if (node['Plans']) {
          return node['Plans'].some(hasIndexScan);
        }
        return false;
      };
      
      return hasIndexScan(plan['Plan']);
    }
    
    return false;
  } catch (error) {
    logger.error('Feil ved indeks sjekk:', error);
    return false;
  }
};

/**
 * Finn trege queries (over en gitt threshold)
 * @param {number} thresholdMs - Threshold i millisekunder
 * @returns {Promise<Array>} - Liste over trege queries
 */
const findSlowQueries = async (thresholdMs = 1000) => {
  try {
    // Hent trege queries fra pg_stat_statements (krever extension)
    const result = await pool.query(`
      SELECT 
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        max_exec_time,
        min_exec_time,
        stddev_exec_time
      FROM pg_stat_statements
      WHERE mean_exec_time > $1
      ORDER BY mean_exec_time DESC
      LIMIT 20
    `, [thresholdMs]);
    
    return result.rows;
  } catch (error) {
    // pg_stat_statements extension er kanskje ikke installert
    logger.warn('Kunne ikke hente trege queries (pg_stat_statements ikke tilgjengelig):', error.message);
    return [];
  }
};

/**
 * Analyser alle tabeller for statistikk
 * @returns {Promise<Object>} - Tabell statistikk
 */
const analyzeTables = async () => {
  try {
    const result = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation,
        most_common_vals,
        most_common_freqs
      FROM pg_stats
      WHERE schemaname = 'public'
      ORDER BY tablename, attname
    `);
    
    return result.rows;
  } catch (error) {
    logger.error('Feil ved tabell analyse:', error);
    throw error;
  }
};

/**
 * Sjekk indeks bruk for en tabell
 * @param {string} tableName - Tabell navn
 * @returns {Promise<Array>} - Liste over indekser og deres bruk
 */
const checkIndexUsage = async (tableName) => {
  try {
    const result = await pool.query(`
      SELECT 
        indexrelname as index_name,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public' AND relname = $1
      ORDER BY idx_scan DESC
    `, [tableName]);
    
    return result.rows;
  } catch (error) {
    logger.error('Feil ved indeks bruk sjekk:', error);
    throw error;
  }
};

/**
 * Foreslå nye indekser basert på query patterns
 * @returns {Promise<Array>} - Foreslåtte indekser
 */
const suggestIndexes = async () => {
  try {
    // Dette er en forenklet versjon - i produksjon ville man analysert faktiske queries
    const result = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats
      WHERE schemaname = 'public'
        AND n_distinct > 10
        AND correlation < 0.5
      ORDER BY tablename, n_distinct DESC
    `);
    
    return result.rows.map(row => ({
      table: row.tablename,
      column: row.attname,
      reason: `Høy kardinalitet (${row.n_distinct} distinkte verdier) og lav korrelasjon (${row.correlation.toFixed(2)})`
    }));
  } catch (error) {
    logger.error('Feil ved indeks forslag:', error);
    throw error;
  }
};

module.exports = {
  analyzeQuery,
  usesIndexes,
  findSlowQueries,
  analyzeTables,
  checkIndexUsage,
  suggestIndexes
};

