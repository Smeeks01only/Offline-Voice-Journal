import { openDatabase } from './database';

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
