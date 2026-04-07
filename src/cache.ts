import Database from "better-sqlite3";
import crypto from "node:crypto";

export class Cache {
  private db: Database.Database;

  constructor(dbPath: string = "cache.sqlite") {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    const createTable = `
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `;
    this.db.exec(createTable);
  }

  get(key: string): unknown | null {
    const row = this.db
      .prepare("SELECT value, expires_at FROM cache WHERE key = ?")
      .get(key) as { value: string; expires_at: number } | undefined;

    if (!row) return null;

    const now = Math.floor(Date.now() / 1000);
    if (now >= row.expires_at) {
      this.db.prepare("DELETE FROM cache WHERE key = ?").run(key);
      return null;
    }

    return JSON.parse(row.value);
  }

  set(key: string, value: unknown, ttlSeconds: number): void {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    this.db
      .prepare(
        "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)"
      )
      .run(key, JSON.stringify(value), expiresAt);
  }

  close(): void {
    this.db.close();
  }

  static makeKey(operation: string, params: Record<string, unknown>): string {
    const sorted = JSON.stringify(params, Object.keys(params).sort());
    const hash = crypto.createHash("sha256").update(sorted).digest("hex").slice(0, 16);
    return `${operation}:${hash}`;
  }
}
