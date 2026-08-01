import * as SQLite from 'expo-sqlite';

let db = null;

export const openDatabase = async () => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('voicejournal.db');
  return db;
};

export const initDatabase = async () => {
  const database = await openDatabase();
  
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT,
      audio_uri TEXT,
      transcript TEXT,
      duration_sec REAL,
      status TEXT,
      error_message TEXT,
      waveform_samples TEXT
    );

    CREATE TABLE IF NOT EXISTS reflections (
      entry_id INTEGER REFERENCES entries(id) ON DELETE CASCADE,
      mood TEXT,
      themes TEXT,
      summary TEXT,
      follow_up_question TEXT,
      model_version TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
};
