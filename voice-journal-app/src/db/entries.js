import { openDatabase } from './database';
import * as FileSystem from 'expo-file-system/legacy';

export const createEntry = async (entry) => {
  const db = await openDatabase();
  const { audio_uri, duration_sec, status, waveform_samples } = entry;
  const created_at = new Date().toISOString();
  
  const waveformStr = waveform_samples ? JSON.stringify(waveform_samples) : null;
  
  const result = await db.runAsync(
    'INSERT INTO entries (created_at, audio_uri, duration_sec, status, waveform_samples) VALUES (?, ?, ?, ?, ?)',
    [created_at, audio_uri, duration_sec, status, waveformStr]
  );
  return result.lastInsertRowId;
};

export const updateEntry = async (id, fields) => {
  const db = await openDatabase();
  
  const setClauses = [];
  const values = [];
  
  for (const [key, value] of Object.entries(fields)) {
    setClauses.push(`${key} = ?`);
    if (key === 'waveform_samples' && value !== null) {
      values.push(JSON.stringify(value));
    } else {
      values.push(value);
    }
  }
  
  if (setClauses.length === 0) return;
  
  values.push(id);
  const sql = `UPDATE entries SET ${setClauses.join(', ')} WHERE id = ?`;
  
  await db.runAsync(sql, values);
};

export const getAllEntries = async () => {
  const db = await openDatabase();
  const rows = await db.getAllAsync('SELECT * FROM entries ORDER BY created_at DESC');
  return rows.map(row => ({
    ...row,
    waveform_samples: row.waveform_samples ? JSON.parse(row.waveform_samples) : null
  }));
};

export const getEntry = async (id) => {
  const db = await openDatabase();
  const row = await db.getFirstAsync('SELECT * FROM entries WHERE id = ?', [id]);
  if (!row) return null;
  
  return {
    ...row,
    waveform_samples: row.waveform_samples ? JSON.parse(row.waveform_samples) : null
  };
};

export const getReflection = async (entryId) => {
  const db = await openDatabase();
  const row = await db.getFirstAsync('SELECT * FROM reflections WHERE entry_id = ?', [entryId]);
  if (!row) return null;
  
  return {
    ...row,
    themes: row.themes ? JSON.parse(row.themes) : null
  };
};

export const createReflection = async (entryId, fields) => {
  const db = await openDatabase();
  const { mood, themes, summary, follow_up_question, model_version } = fields;
  const created_at = new Date().toISOString();
  const themesStr = themes ? JSON.stringify(themes) : null;
  
  await db.runAsync(
    'INSERT INTO reflections (entry_id, mood, themes, summary, follow_up_question, model_version, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [entryId, mood, themesStr, summary, follow_up_question, model_version, created_at]
  );
};

export const searchEntries = async (query) => {
  const db = await openDatabase();
  const likeQuery = `%${query}%`;
  const rows = await db.getAllAsync(
    'SELECT * FROM entries WHERE transcript LIKE ? ORDER BY created_at DESC',
    [likeQuery]
  );
  return rows.map(row => ({
    ...row,
    waveform_samples: row.waveform_samples ? JSON.parse(row.waveform_samples) : null
  }));
};

export const getStuckEntries = async () => {
  const db = await openDatabase();
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  
  const rows = await db.getAllAsync(
    "SELECT * FROM entries WHERE status IN ('pending', 'transcribing') AND created_at < ? ORDER BY created_at ASC",
    [twoMinutesAgo]
  );
  return rows.map(row => ({
    ...row,
    waveform_samples: row.waveform_samples ? JSON.parse(row.waveform_samples) : null
  }));
};

export const clearAllData = async () => {
  const db = await openDatabase();
  await db.execAsync(`
    DELETE FROM reflections;
    DELETE FROM entries;
    DELETE FROM settings;
  `);

  const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
  for (const file of files) {
    if (file.endsWith('.m4a')) {
      await FileSystem.deleteAsync(FileSystem.documentDirectory + file, { idempotent: true });
    }
  }
};

export const getSetting = async (key) => {
  const db = await openDatabase();
  const row = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : null;
};

export const setSetting = async (key, value) => {
  const db = await openDatabase();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    [key, value, value]
  );
};

export const getStats = async () => {
  const db = await openDatabase();
  
  const totalRow = await db.getFirstAsync("SELECT COUNT(*) as count FROM entries WHERE status = 'done'");
  const totalEntries = totalRow.count;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekRow = await db.getFirstAsync("SELECT COUNT(*) as count FROM entries WHERE status = 'done' AND created_at >= ?", [sevenDaysAgo]);
  const entriesThisWeek = weekRow.count;

  const rows = await db.getAllAsync("SELECT created_at FROM entries WHERE status = 'done' ORDER BY created_at DESC");
  let streak = 0;
  if (rows.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const mostRecentDate = new Date(rows[0].created_at);
    mostRecentDate.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(today - mostRecentDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) {
      let uniqueDates = new Set();
      for (const row of rows) {
        const d = new Date(row.created_at);
        d.setHours(0, 0, 0, 0);
        uniqueDates.add(d.getTime());
      }
      
      const uniqueDatesArr = Array.from(uniqueDates).sort((a, b) => b - a);
      
      streak = 1;
      let currentCheck = uniqueDatesArr[0];
      for (let i = 1; i < uniqueDatesArr.length; i++) {
        const nextCheck = uniqueDatesArr[i];
        const dayDiff = Math.floor((currentCheck - nextCheck) / (1000 * 60 * 60 * 24));
        if (dayDiff === 1) {
          streak++;
          currentCheck = nextCheck;
        } else {
          break;
        }
      }
    }
  }

  return {
    totalEntries,
    entriesThisWeek,
    currentStreak: streak
  };
};

export const deleteEntry = async (id, audioUri) => {
  const db = await openDatabase();
  await db.runAsync('DELETE FROM reflections WHERE entry_id = ?', [id]);
  await db.runAsync('DELETE FROM entries WHERE id = ?', [id]);
  
  if (audioUri) {
    try {
      await FileSystem.deleteAsync(audioUri, { idempotent: true });
    } catch (e) {
      console.error("Failed to delete audio file", e);
    }
  }
};

export const updateReflection = async (entryId, fields) => {
  const db = await openDatabase();
  const setClauses = [];
  const values = [];
  
  for (const [key, value] of Object.entries(fields)) {
    setClauses.push(`${key} = ?`);
    if (key === 'themes' && value !== null) {
      values.push(JSON.stringify(value));
    } else {
      values.push(value);
    }
  }
  
  if (setClauses.length === 0) return;
  
  values.push(entryId);
  const sql = `UPDATE reflections SET ${setClauses.join(', ')} WHERE entry_id = ?`;
  
  await db.runAsync(sql, values);
};
