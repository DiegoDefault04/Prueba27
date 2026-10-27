import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { SCHEMA_SQL } from './schema';

export type Db = Database.Database;

/** Abre (y crea si hace falta) la base de datos. Usa ':memory:' en pruebas. */
export function openDatabase(file: string): Db {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  }
  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  if (file !== ':memory:') db.pragma('journal_mode = WAL');
  db.exec(SCHEMA_SQL);
  return db;
}
