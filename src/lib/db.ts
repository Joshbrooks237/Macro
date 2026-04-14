import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "macro-predictions.db");

let db: Database.Database | null = null;

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
      asset TEXT NOT NULL CHECK (asset IN ('oil', 'gold', 'stocks', 'crypto')),
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
  db = instance;
  return instance;
}
