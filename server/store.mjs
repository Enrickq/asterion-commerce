import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** A small durable store. All writes use optimistic versions as well as SQLite locks. */
export function createStore(options = {}) {
  if (typeof options === 'string') options = { filePath: options };
  const filePath = options.filePath ?? resolve(options.dataDir ?? process.env.DATA_DIR ?? 'data', 'asterion.sqlite');
  if (filePath !== ':memory:') mkdirSync(dirname(resolve(filePath)), { recursive: true });
  const db = new DatabaseSync(filePath);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS agreements (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      document TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      document TEXT NOT NULL,
      received_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS agreements_owner_created ON agreements (json_extract(document, '$.ownerId'), created_at DESC);
    CREATE INDEX IF NOT EXISTS agreements_autopilot_due ON agreements (json_extract(document, '$.autopilot.status'), json_extract(document, '$.autopilot.runAt'));
  `);
  const byId = db.prepare('SELECT document FROM agreements WHERE id = ?');
  const all = db.prepare('SELECT document FROM agreements ORDER BY created_at DESC, id DESC LIMIT 100');
  const byOwner = db.prepare("SELECT document FROM agreements WHERE json_extract(document, '$.ownerId') = ? ORDER BY created_at DESC, id DESC LIMIT 100");
  const dueAutopilots = db.prepare("SELECT document FROM agreements WHERE json_extract(document, '$.autopilot.status') IN ('ARMED', 'RUNNING') AND json_extract(document, '$.autopilot.runAt') <= ? ORDER BY json_extract(document, '$.autopilot.runAt') ASC LIMIT 5");
  const insert = db.prepare('INSERT INTO agreements (id, version, document, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
  const update = db.prepare('UPDATE agreements SET version = ?, document = ?, updated_at = ? WHERE id = ? AND version = ?');
  const recordWebhook = db.prepare('INSERT OR IGNORE INTO webhook_events (id, document, received_at) VALUES (?, ?, ?)');

  return {
    filePath,
    get(id) {
      const row = byId.get(id);
      return row ? JSON.parse(row.document) : null;
    },
    list(ownerId) { return (ownerId === undefined ? all.all() : byOwner.all(ownerId)).map(row => JSON.parse(row.document)); },
    dueAutopilots(at) { return dueAutopilots.all(at).map(row => JSON.parse(row.document)); },
    insert(agreement) {
      const doc = { ...agreement, version: 1 };
      insert.run(doc.id, doc.version, JSON.stringify(doc), doc.createdAt, doc.updatedAt ?? doc.createdAt);
      return structuredClone(doc);
    },
    save(agreement) {
      const doc = { ...agreement, version: agreement.version + 1 };
      const result = update.run(doc.version, JSON.stringify(doc), doc.updatedAt, doc.id, agreement.version);
      if (result.changes !== 1) {
        const error = new Error('El acuerdo ha cambiado en otra operación. Recarga su estado.');
        error.statusCode = 409;
        error.code = 'CONCURRENT_UPDATE';
        throw error;
      }
      return structuredClone(doc);
    },
    recordWebhook(event) {
      return recordWebhook.run(event.id, JSON.stringify(event), new Date().toISOString()).changes === 1;
    },
    close() { db.close(); },
  };
}
