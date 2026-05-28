import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storageRoot = process.env.VERCEL
  ? path.join('/tmp', 'primecell')
  : path.join(__dirname, '..');

const dataDir = path.join(storageRoot, 'data');
const uploadsDir = path.join(storageRoot, 'uploads');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const dbPath = path.join(dataDir, 'primecell.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      store_name TEXT DEFAULT 'PrimeCell',
      address TEXT DEFAULT '',
      cnpj TEXT DEFAULT '',
      logo_path TEXT DEFAULT '',
      warranty_template TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      cpf TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      phone_model TEXT,
      brand TEXT,
      color TEXT,
      imei TEXT,
      device_password TEXT,
      description TEXT,
      repair_details TEXT,
      parts_used TEXT,
      pre_existing_defects TEXT,
      technical_notes TEXT,
      entry_date TEXT,
      delivery_date TEXT,
      status TEXT DEFAULT 'em_andamento',
      warranty_days INTEGER DEFAULT 30,
      warranty_start TEXT,
      warranty_end TEXT,
      warranty_file TEXT,
      part_cost REAL DEFAULT 0,
      labor_cost REAL DEFAULT 0,
      total_charged REAL DEFAULT 0,
      profit REAL DEFAULT 0,
      payment_method TEXT,
      paid_in_full INTEGER DEFAULT 1,
      installments_count INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      number INTEGER NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'pendente',
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS service_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS extra_revenues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO store_settings (id, store_name) VALUES (1, 'PrimeCell');
  `);

  ensureDefaultUser();
}

function ensureDefaultUser() {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (count.c > 0) return;
  const hash = bcrypt.hashSync('primecell123', 10);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(
    'admin',
    hash
  );
}

export { uploadsDir };
