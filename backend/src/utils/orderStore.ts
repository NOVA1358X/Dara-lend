import pg from 'pg';
import { config } from './config.js';

// ─── Order Persistence Layer ────────────────────────────────────
// Uses PostgreSQL when DATABASE_URL is set, falls back to in-memory only.
// This ensures the dark pool bot survives Render restarts without
// losing tracked orders.

const { Pool } = pg;

let pool: pg.Pool | null = null;
let dbReady = false;

export interface StoredOrder {
  tx_id: string;
  market_id: string;
  program_id: string;
  direction: 'buy' | 'sell';
  trader: string;
  record_plaintext: string | null;
  order_id: string | null;
  size: number;
  limit_price: number;
  batch_id: number;
  matched: boolean;
  created_at: number;
}

/**
 * Initialize the order store. Creates the orders table if needed.
 * Safe to call multiple times — no-ops if already initialized.
 */
export async function initOrderStore(): Promise<void> {
  if (!config.databaseUrl) {
    console.log('[order-store] No DATABASE_URL — using in-memory only');
    return;
  }

  try {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    // Test connection
    const client = await pool.connect();
    client.release();

    // Create table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS darkpool_orders (
        tx_id         TEXT PRIMARY KEY,
        market_id     TEXT NOT NULL,
        program_id    TEXT NOT NULL,
        direction     TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
        trader        TEXT NOT NULL,
        record_plaintext TEXT,
        order_id      TEXT,
        size          BIGINT NOT NULL DEFAULT 0,
        limit_price   BIGINT NOT NULL DEFAULT 0,
        batch_id      BIGINT NOT NULL DEFAULT 0,
        matched       BOOLEAN NOT NULL DEFAULT FALSE,
        created_at    BIGINT NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_orders_market ON darkpool_orders(market_id);
      CREATE INDEX IF NOT EXISTS idx_orders_matched ON darkpool_orders(matched);
    `);

    dbReady = true;
    console.log('[order-store] PostgreSQL connected and table ready');
  } catch (err) {
    console.error('[order-store] PostgreSQL init failed, falling back to in-memory:', err);
    pool = null;
    dbReady = false;
  }
}

/**
 * Save an order to the database. No-op if DB not available.
 */
export async function saveOrder(order: StoredOrder): Promise<void> {
  if (!pool || !dbReady) return;

  try {
    await pool.query(
      `INSERT INTO darkpool_orders (tx_id, market_id, program_id, direction, trader,
        record_plaintext, order_id, size, limit_price, batch_id, matched, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (tx_id) DO UPDATE SET
         record_plaintext = COALESCE(EXCLUDED.record_plaintext, darkpool_orders.record_plaintext),
         order_id = COALESCE(EXCLUDED.order_id, darkpool_orders.order_id),
         batch_id = EXCLUDED.batch_id,
         matched = EXCLUDED.matched`,
      [
        order.tx_id, order.market_id, order.program_id, order.direction,
        order.trader, order.record_plaintext, order.order_id,
        order.size, order.limit_price, order.batch_id, order.matched, order.created_at,
      ],
    );
  } catch (err) {
    console.warn('[order-store] saveOrder failed:', err);
  }
}

/**
 * Load all unmatched orders for a specific market from the database.
 */
export async function loadOrders(marketId: string): Promise<StoredOrder[]> {
  if (!pool || !dbReady) return [];

  try {
    const result = await pool.query(
      `SELECT * FROM darkpool_orders WHERE market_id = $1 AND matched = FALSE ORDER BY created_at ASC`,
      [marketId],
    );
    return result.rows.map(row => ({
      tx_id: row.tx_id,
      market_id: row.market_id,
      program_id: row.program_id,
      direction: row.direction as 'buy' | 'sell',
      trader: row.trader,
      record_plaintext: row.record_plaintext,
      order_id: row.order_id,
      size: Number(row.size),
      limit_price: Number(row.limit_price),
      batch_id: Number(row.batch_id),
      matched: row.matched,
      created_at: Number(row.created_at),
    }));
  } catch (err) {
    console.warn('[order-store] loadOrders failed:', err);
    return [];
  }
}

/**
 * Update an order's resolved record data in the database.
 */
export async function updateOrderRecord(txId: string, recordPlaintext: string, orderId: string | null): Promise<void> {
  if (!pool || !dbReady) return;

  try {
    await pool.query(
      `UPDATE darkpool_orders SET record_plaintext = $1, order_id = $2 WHERE tx_id = $3`,
      [recordPlaintext, orderId, txId],
    );
  } catch (err) {
    console.warn('[order-store] updateOrderRecord failed:', err);
  }
}

/**
 * Mark an order as matched in the database.
 */
export async function markOrderMatched(txId: string): Promise<void> {
  if (!pool || !dbReady) return;

  try {
    await pool.query(
      `UPDATE darkpool_orders SET matched = TRUE WHERE tx_id = $1`,
      [txId],
    );
  } catch (err) {
    console.warn('[order-store] markOrderMatched failed:', err);
  }
}

/**
 * Remove matched orders for a specific market (cleanup after batch advance).
 */
export async function cleanupMatchedOrders(marketId: string): Promise<void> {
  if (!pool || !dbReady) return;

  try {
    const result = await pool.query(
      `DELETE FROM darkpool_orders WHERE market_id = $1 AND matched = TRUE`,
      [marketId],
    );
    if (result.rowCount && result.rowCount > 0) {
      console.log(`[order-store] Cleaned up ${result.rowCount} matched orders for ${marketId}`);
    }
  } catch (err) {
    console.warn('[order-store] cleanupMatchedOrders failed:', err);
  }
}

/**
 * Check if the database is connected and operational.
 */
export function isDbReady(): boolean {
  return dbReady;
}
