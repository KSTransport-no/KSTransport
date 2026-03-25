#!/usr/bin/env node

/**
 * Script for å analysere database queries
 * Bruk: node scripts/analyze-queries.js [query]
 */

require('dotenv').config();
const { analyzeQuery, usesIndexes, findSlowQueries, checkIndexUsage, suggestIndexes } = require('../utils/queryAnalyzer');
const logger = require('../utils/logger');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'analyze':
        if (args.length < 2) {
          console.log('Bruk: node scripts/analyze-queries.js analyze "SELECT * FROM skift WHERE sjåfør_id = $1" [params...]');
          process.exit(1);
        }
        const query = args[1];
        const params = args.slice(2);
        
        console.log('Analyserer query...');
        const analysis = await analyzeQuery(query, params);
        
        if (analysis) {
          console.log('\n=== Query Analyse ===');
          console.log(`Query: ${query}`);
          console.log(`Planning Time: ${analysis.planningTime}ms`);
          console.log(`Execution Time: ${analysis.executionTime}ms`);
          console.log(`Total Time: ${analysis.totalTime}ms`);
          console.log('\n=== Query Plan ===');
          console.log(JSON.stringify(analysis.plan, null, 2));
        }
        break;

      case 'check-indexes':
        if (args.length < 2) {
          console.log('Bruk: node scripts/analyze-queries.js check-indexes <table_name>');
          process.exit(1);
        }
        const tableName = args[1];
        
        console.log(`Sjekker indeks bruk for tabell: ${tableName}`);
        const indexUsage = await checkIndexUsage(tableName);
        
        console.log('\n=== Indeks Bruk ===');
        indexUsage.forEach(idx => {
          console.log(`${idx.index_name}: ${idx.index_scans} scans, ${idx.tuples_read} tuples read`);
        });
        break;

      case 'slow-queries':
        const threshold = parseInt(args[1]) || 1000;
        console.log(`Finner trege queries (over ${threshold}ms)...`);
        
        const slowQueries = await findSlowQueries(threshold);
        
        if (slowQueries.length === 0) {
          console.log('Ingen trege queries funnet.');
        } else {
          console.log('\n=== Trege Queries ===');
          slowQueries.forEach((q, i) => {
            console.log(`\n${i + 1}. Mean execution time: ${q.mean_exec_time.toFixed(2)}ms`);
            console.log(`   Calls: ${q.calls}`);
            console.log(`   Max: ${q.max_exec_time.toFixed(2)}ms`);
            console.log(`   Query: ${q.query.substring(0, 100)}...`);
          });
        }
        break;

      case 'suggest-indexes':
        console.log('Foreslår nye indekser...');
        
        const suggestions = await suggestIndexes();
        
        if (suggestions.length === 0) {
          console.log('Ingen nye indekser foreslått.');
        } else {
          console.log('\n=== Foreslåtte Indekser ===');
          suggestions.forEach((s, i) => {
            console.log(`${i + 1}. ${s.table}.${s.column}`);
            console.log(`   Reason: ${s.reason}`);
            console.log(`   CREATE INDEX idx_${s.table}_${s.column} ON ${s.table}(${s.column});`);
          });
        }
        break;

      default:
        console.log('Tilgjengelige kommandoer:');
        console.log('  analyze <query> [params...]  - Analyser en query');
        console.log('  check-indexes <table>        - Sjekk indeks bruk for en tabell');
        console.log('  slow-queries [threshold]     - Finn trege queries (default: 1000ms)');
        console.log('  suggest-indexes              - Foreslå nye indekser');
        process.exit(1);
    }
  } catch (error) {
    logger.error('Feil:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();

