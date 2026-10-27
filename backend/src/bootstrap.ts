import type { Express } from 'express';
import { curriculum } from './data/curriculum';
import { openDatabase, type Db } from './db/connection';
import { seedDatabase } from './db/seed';
import { createApp, type AppOptions } from './http/app';
import { AttemptRepository } from './repositories/attemptRepository';
import { ContentRepository } from './repositories/contentRepository';
import { JourneyRepository } from './repositories/journeyRepository';
import { JourneyService } from './services/journeyService';

export interface Application {
  app: Express;
  db: Db;
  service: JourneyService;
}

/** Composición de dependencias: base de datos → repositorios → servicio → HTTP. */
export function buildApplication(databasePath: string, options: AppOptions = {}): Application {
  const db = openDatabase(databasePath);
  seedDatabase(db, curriculum);

  const service = new JourneyService(
    db,
    new ContentRepository(db),
    new JourneyRepository(db),
    new AttemptRepository(db),
  );
  return { app: createApp(service, options), db, service };
}
