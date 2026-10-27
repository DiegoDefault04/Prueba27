import { buildApplication } from './bootstrap';
import { config } from './config';

const { app, db } = buildApplication(config.databasePath, { corsOrigin: config.corsOrigin });

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`API escuchando en http://0.0.0.0:${config.port} (DB: ${config.databasePath})`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
