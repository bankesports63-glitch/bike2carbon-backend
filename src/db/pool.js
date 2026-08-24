const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

// Initialize database (inside backend folder for full read/write permissions on Cloud)
const dbPath = path.join(__dirname, '../../bike2carbon.sqlite');
let dbInstance = null;

const getDb = async () => {
  if (!dbInstance) {
    dbInstance = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    // Enable foreign keys
    await dbInstance.run('PRAGMA foreign_keys = ON');
  }
  return dbInstance;
};

// Translate PostgreSQL query syntax to SQLite syntax
function translatePgToSqlite(text) {
  let sql = text;

  // Replace $1, $2, ... with ?
  sql = sql.replace(/\$\d+/g, '?');

  // Replace Postgres type casts ::float, ::int, ::text, etc.
  sql = sql.replace(/::[a-zA-Z_]+/g, '');

  // Replace NOW() with datetime('now')
  sql = sql.replace(/\bNOW\(\)/gi, "datetime('now')");

  // Replace DATE_TRUNC('week', NOW()) or DATE_TRUNC('week', datetime('now'))
  sql = sql.replace(/DATE_TRUNC\s*\(\s*'week'\s*,\s*(?:NOW\(\)|datetime\('now'\)|[^)]+\))\s*\)/gi, "datetime('now', '-7 days')");
  sql = sql.replace(/DATE_TRUNC\s*\(\s*'week'\s*,\s*NOW\(\)\s*\)/gi, "datetime('now', '-7 days')");

  // Replace DATE_TRUNC('day', ...)
  sql = sql.replace(/DATE_TRUNC\s*\(\s*'day'\s*,\s*(?:NOW\(\)|datetime\('now'\)|[^)]+\))\s*\)/gi, "datetime('now', 'start of day')");
  sql = sql.replace(/DATE_TRUNC\s*\(\s*'day'\s*,\s*NOW\(\)\s*\)/gi, "datetime('now', 'start of day')");

  // Replace DATE_TRUNC('month', ...)
  sql = sql.replace(/DATE_TRUNC\s*\(\s*'month'\s*,\s*(?:NOW\(\)|datetime\('now'\)|[^)]+\))\s*\)/gi, "datetime('now', 'start of month')");
  sql = sql.replace(/DATE_TRUNC\s*\(\s*'month'\s*,\s*NOW\(\)\s*\)/gi, "datetime('now', 'start of month')");

  // Replace NOW() - INTERVAL '30 days' or similar
  sql = sql.replace(/datetime\('now'\)\s*-\s*INTERVAL\s*'(\d+)\s*days'/gi, "datetime('now', '-$1 days')");
  sql = sql.replace(/NOW\(\)\s*-\s*INTERVAL\s*'(\d+)\s*days'/gi, "datetime('now', '-$1 days')");

  // Replace GREATEST(a, b) with MAX(a, b)
  sql = sql.replace(/\bGREATEST\b/gi, "MAX");

  return sql;
}

const pool = {
  query: async (text, params = []) => {
    const db = await getDb();
    const sqliteText = translatePgToSqlite(text);

    const trimmed = sqliteText.trim().toUpperCase();
    if (trimmed === 'BEGIN' || trimmed === 'BEGIN;') {
      try { await db.run('BEGIN'); } catch (_) {}
      return { rows: [], rowCount: 0 };
    }
    if (trimmed === 'COMMIT' || trimmed === 'COMMIT;') {
      try { await db.run('COMMIT'); } catch (_) {}
      return { rows: [], rowCount: 0 };
    }
    if (trimmed === 'ROLLBACK' || trimmed === 'ROLLBACK;') {
      try { await db.run('ROLLBACK'); } catch (_) {}
      return { rows: [], rowCount: 0 };
    }

    const isSelect = sqliteText.trim().toUpperCase().startsWith('SELECT') || 
                     sqliteText.trim().toUpperCase().startsWith('WITH') ||
                     sqliteText.trim().toUpperCase().startsWith('PRAGMA');
    const isReturning = sqliteText.toUpperCase().includes('RETURNING');

    try {
      if (isSelect || isReturning) {
        const rows = await db.all(sqliteText, params);
        return { rows: rows || [], rowCount: rows ? rows.length : 0 };
      } else if (params.length === 0 && sqliteText.includes(';')) {
        await db.exec(sqliteText);
        return { rows: [], rowCount: 0 };
      } else {
        const result = await db.run(sqliteText, params);
        return { rows: [], rowCount: result.changes || 0, lastID: result.lastID };
      }
    } catch (e) {
      console.error('SQLite query error:', e.message, '\nSQL:', sqliteText, '\nParams:', params);
      throw e;
    }
  },
  connect: async () => {
    return {
      query: pool.query,
      release: () => {}
    };
  },
  on: (event, cb) => {
    if (event === 'connect') {
      getDb().then(() => cb()).catch(console.error);
    }
  }
};

module.exports = pool;
