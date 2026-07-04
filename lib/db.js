import { sql } from '@vercel/postgres';
import { createPool } from '@vercel/postgres';

let pool;

function getPool() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!pool && connectionString) {
    pool = createPool({ connectionString });
  }
  return pool;
}

// Simple wrapper to execute queries
export async function executeQuery(queryText, values = []) {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('[DB] Postgres URL is not defined. Skipping query.');
    return { rows: [] };
  }
  
  try {
    const currentPool = getPool();
    const result = await currentPool.query(queryText, values);
    return { rows: result.rows };
  } catch (error) {
    console.error('[DB] Query Error:', error);
    return { rows: [] };
  }
}

export async function initDbSchema() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) return;

  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY,
        paste_id VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        session_id VARCHAR(100),
        ip_hash VARCHAR(64),
        user_agent TEXT,
        referrer TEXT,
        device_type VARCHAR(20),
        country VARCHAR(5)
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS auth_tokens (
        id UUID PRIMARY KEY,
        token VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE
      );
    `);
    
    // Migrations: Add new columns if they don't exist
    await executeQuery(`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS event_type VARCHAR(20) DEFAULT 'view';`);
    await executeQuery(`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS os VARCHAR(20) DEFAULT 'unknown';`);

    // Create indexes for fast querying
    await executeQuery(`CREATE INDEX IF NOT EXISTS idx_analytics_paste_id ON analytics_events(paste_id);`);
    await executeQuery(`CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp);`);
    await executeQuery(`CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);`);
        // Schema initialized
  } catch (e) {
    console.error('[DB] Schema initialization failed:', e);
  }
}
