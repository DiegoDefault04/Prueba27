export const config = {
  port: Number(process.env.PORT ?? 3001),
  databasePath: process.env.DATABASE_PATH ?? './data/app.db',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
};
