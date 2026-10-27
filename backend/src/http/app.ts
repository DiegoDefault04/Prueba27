import cors from 'cors';
import express, { type ErrorRequestHandler, type Express } from 'express';
import { ZodError, z } from 'zod';
import type { DomainErrorCode } from '../domain/errors';
import { DomainError } from '../domain/errors';
import type { JourneyService } from '../services/journeyService';

const STATUS_BY_CODE: Record<DomainErrorCode, number> = {
  ACTIVITY_NOT_FOUND: 404,
  THEORY_NOT_FOUND: 404,
  INVALID_OPTION: 422,
  ACTIVITY_NOT_AVAILABLE: 409,
  THEORY_NOT_AVAILABLE: 409,
  JOURNEY_COMPLETED: 409,
};

const answerBody = z.object({
  activityId: z.string().min(1),
  optionId: z.string().min(1),
});

const theoryBody = z.object({
  theoryId: z.string().min(1),
});

export interface AppOptions {
  corsOrigin?: string;
  /** Silencia el log de errores 500 (útil en pruebas). */
  quiet?: boolean;
}

export function createApp(service: JourneyService, options: AppOptions = {}): Express {
  const app = express();
  app.use(cors({ origin: options.corsOrigin ?? '*' }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/journey', (_req, res) => {
    res.json(service.getJourney());
  });

  app.get('/api/journey/attempts', (_req, res) => {
    res.json({ attempts: service.getAttempts() });
  });

  app.post('/api/journey/answers', (req, res) => {
    const { activityId, optionId } = answerBody.parse(req.body);
    res.status(201).json(service.submitAnswer(activityId, optionId));
  });

  app.post('/api/journey/theory/acknowledge', (req, res) => {
    const { theoryId } = theoryBody.parse(req.body);
    res.json(service.acknowledgeTheory(theoryId));
  });

  app.post('/api/journey/reset', (_req, res) => {
    res.json(service.reset());
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' } });
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La solicitud no es válida.',
          details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      });
      return;
    }
    if (err instanceof DomainError) {
      res.status(STATUS_BY_CODE[err.code]).json({ error: { code: err.code, message: err.message } });
      return;
    }
    if (err && (err as { type?: string }).type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'INVALID_JSON', message: 'El cuerpo no es JSON válido.' } });
      return;
    }
    if (!options.quiet) console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' } });
  };
  app.use(errorHandler);

  return app;
}
