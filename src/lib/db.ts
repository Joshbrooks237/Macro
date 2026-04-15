import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { ASSET_KEYS } from "@/types/prediction";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "macro-predictions.db");

let db: Database.Database | null = null;

const ASSET_CHECK = `(${ASSET_KEYS.map((k) => `'${k}'`).join(", ")})`;

/** Recreate table when CHECK constraint is older than current ASSET_KEYS (e.g. new market added). */
function ensurePredictionsSchema(instance: Database.Database) {
  const row = instance
    .prepare(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name='predictions'`,
    )
    .get() as { sql: string } | undefined;

  if (!row?.sql) return;
  if (ASSET_KEYS.every((k) => row.sql.includes(`'${k}'`))) return;

  instance.exec(`
    BEGIN IMMEDIATE;
    CREATE TABLE predictions_migrate (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      asset TEXT NOT NULL CHECK (asset IN ${ASSET_CHECK}),
      direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
      horizon_hours INTEGER NOT NULL CHECK (horizon_hours IN (24, 48)),
      note TEXT,
      entry_price REAL NOT NULL,
      due_at TEXT NOT NULL,
      resolved_at TEXT,
      exit_price REAL,
      pct_change REAL,
      outcome TEXT NOT NULL DEFAULT 'pending'
        CHECK (outcome IN ('pending', 'correct', 'incorrect', 'neutral'))
    );
    INSERT INTO predictions_migrate SELECT * FROM predictions;
    DROP TABLE predictions;
    ALTER TABLE predictions_migrate RENAME TO predictions;
    CREATE INDEX IF NOT EXISTS idx_predictions_due ON predictions(due_at);
    CREATE INDEX IF NOT EXISTS idx_predictions_outcome ON predictions(outcome);
    COMMIT;
  `);
}

export function getDb(): Database.Database {
  if (db) return db;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const instance = new Database(DB_PATH);
  instance.pragma("journal_mode = WAL");
  instance.exec(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      asset TEXT NOT NULL CHECK (asset IN ${ASSET_CHECK}),
      direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
      horizon_hours INTEGER NOT NULL CHECK (horizon_hours IN (24, 48)),
      note TEXT,
      entry_price REAL NOT NULL,
      due_at TEXT NOT NULL,
      resolved_at TEXT,
      exit_price REAL,
      pct_change REAL,
      outcome TEXT NOT NULL DEFAULT 'pending'
        CHECK (outcome IN ('pending', 'correct', 'incorrect', 'neutral'))
    );
    CREATE INDEX IF NOT EXISTS idx_predictions_due ON predictions(due_at);
    CREATE INDEX IF NOT EXISTS idx_predictions_outcome ON predictions(outcome);
  `);
  ensurePredictionsSchema(instance);
  db = instance;
  return instance;
}
