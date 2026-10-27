import { config } from '../config';
import { curriculum } from '../data/curriculum';
import { openDatabase } from './connection';
import { seedDatabase } from './seed';

const db = openDatabase(config.databasePath);
seedDatabase(db, curriculum);
db.close();
console.log(`Datos iniciales cargados en ${config.databasePath}`);
