import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApplication, type Application } from '../src/bootstrap';

let ctx: Application;

beforeEach(() => {
  ctx = buildApplication(':memory:', { quiet: true });
});
afterEach(() => ctx.db.close());

const api = () => request(ctx.app);
const answer = (activityId: string, optionId: string) =>
  api().post('/api/journey/answers').send({ activityId, optionId });
const readTheory = (theoryId: string) => api().post('/api/journey/theory/acknowledge').send({ theoryId });

describe('GET /api/journey', () => {
  it('devuelve el estado inicial con la ruta y la primera actividad principal', async () => {
    const res = await api().get('/api/journey').expect(200);
    expect(res.body.status).toBe('IN_PROGRESS');
    expect(res.body.phase).toBe('MAIN_ACTIVITY');
    expect(res.body.progress).toEqual({ completedTopics: 0, totalTopics: 3, percent: 0 });
    expect(res.body.roadmap.map((t: { status: string }) => t.status)).toEqual(['CURRENT', 'LOCKED', 'LOCKED']);
    expect(res.body.currentStep.activity.id).toBe('A1');
    expect(res.body.nextStepHint).toBeTruthy();
  });

  it('nunca expone cuál opción es correcta', async () => {
    const res = await api().get('/api/journey').expect(200);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/isCorrect|is_correct|"correct"/);
  });
});

describe('recorrido completo', () => {
  it('principal correcta → siguiente tema', async () => {
    const res = await answer('A1', 'A1-b').expect(201);
    expect(res.body.result).toMatchObject({ correct: true, outcome: 'TOPIC_COMPLETED' });
    expect(res.body.journey.currentStep.activity.id).toBe('A2');
    expect(res.body.journey.progress.completedTopics).toBe(1);
  });

  it('principal incorrecta → teoría → refuerzo → refuerzo incorrecto → teoría → refuerzo correcto', async () => {
    let res = await answer('A1', 'A1-a').expect(201);
    expect(res.body.result).toMatchObject({ correct: false, outcome: 'REVIEW_THEORY' });
    expect(res.body.journey.currentStep).toMatchObject({ type: 'THEORY', theory: { id: 'T1' } });

    res = await readTheory('T1').expect(200);
    expect(res.body.currentStep).toMatchObject({ type: 'REINFORCEMENT_ACTIVITY', activity: { id: 'R1' } });

    res = await answer('R1', 'R1-c').expect(201);
    expect(res.body.result.outcome).toBe('REVIEW_THEORY');
    expect(res.body.journey.currentStep.type).toBe('THEORY');

    // No puede reintentar el refuerzo sin volver a pasar por la teoría
    await answer('R1', 'R1-a').expect(409);

    await readTheory('T1').expect(200);
    res = await answer('R1', 'R1-a').expect(201);
    expect(res.body.result).toMatchObject({ correct: true, outcome: 'TOPIC_COMPLETED' });
    expect(res.body.journey.currentStep.activity.id).toBe('A2');
  });

  it('completa el temario y rechaza envíos posteriores', async () => {
    await answer('A1', 'A1-b').expect(201);
    await answer('A2', 'A2-b').expect(201);
    const res = await answer('A3', 'A3-a').expect(201);
    expect(res.body.result.outcome).toBe('COURSE_COMPLETED');
    expect(res.body.journey).toMatchObject({
      status: 'COMPLETED',
      currentStep: null,
      progress: { completedTopics: 3, totalTopics: 3, percent: 100 },
    });

    const late = await answer('A3', 'A3-a').expect(409);
    expect(late.body.error.code).toBe('JOURNEY_COMPLETED');
    await readTheory('T3').expect(409);
  });

  it('un tema completado no admite nuevas respuestas', async () => {
    await answer('A1', 'A1-b').expect(201);
    const res = await answer('A1', 'A1-b').expect(409);
    expect(res.body.error.code).toBe('ACTIVITY_NOT_AVAILABLE');
  });
});

describe('situaciones incorrectas', () => {
  it('opción inexistente → 422 y no registra intento', async () => {
    const res = await answer('A1', 'nope').expect(422);
    expect(res.body.error.code).toBe('INVALID_OPTION');
    expect((await api().get('/api/journey/attempts')).body.attempts).toHaveLength(0);
  });

  it('opción de otra actividad → 422', async () => {
    await answer('A1', 'A2-b').expect(422);
  });

  it('actividad inexistente → 404', async () => {
    const res = await answer('ZZ', 'x').expect(404);
    expect(res.body.error.code).toBe('ACTIVITY_NOT_FOUND');
  });

  it('un id de teoría no es una actividad → 404', async () => {
    await answer('T1', 'x').expect(404);
  });

  it('actividad de otro tema o paso → 409', async () => {
    await answer('A2', 'A2-b').expect(409);
    const res = await answer('R1', 'R1-a').expect(409); // refuerzo sin pasar por teoría
    expect(res.body.error.code).toBe('ACTIVITY_NOT_AVAILABLE');
  });

  it('no se puede responder estando en la teoría', async () => {
    await answer('A1', 'A1-a').expect(201);
    await answer('A1', 'A1-b').expect(409);
    await answer('R1', 'R1-a').expect(409);
  });

  it('no se puede reconocer teoría fuera de la fase de teoría o de otro tema', async () => {
    const early = await readTheory('T1').expect(409);
    expect(early.body.error.code).toBe('THEORY_NOT_AVAILABLE');

    await answer('A1', 'A1-a').expect(201);
    await readTheory('T2').expect(409);
    await readTheory('nope').expect(404);
  });

  it('cuerpo inválido → 400; JSON malformado → 400', async () => {
    const res = await api().post('/api/journey/answers').send({ activityId: 'A1' }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    await api()
      .post('/api/journey/answers')
      .set('Content-Type', 'application/json')
      .send('{bad json')
      .expect(400);
  });

  it('ruta desconocida → 404 con formato de error estándar', async () => {
    const res = await api().get('/api/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('historial', () => {
  it('conserva actividad, respuesta, resultado y fecha en orden', async () => {
    await answer('A1', 'A1-a');
    await readTheory('T1');
    await answer('R1', 'R1-a');

    const { attempts } = (await api().get('/api/journey/attempts').expect(200)).body;
    expect(attempts).toHaveLength(2);
    expect(attempts[0]).toMatchObject({
      activityId: 'A1',
      optionId: 'A1-a',
      optionLabel: '3',
      correct: false,
      activityKind: 'MAIN_ACTIVITY',
    });
    expect(attempts[1]).toMatchObject({ activityId: 'R1', correct: true, activityKind: 'REINFORCEMENT_ACTIVITY' });
    expect(Number.isNaN(Date.parse(attempts[0].createdAt))).toBe(false);
  });

  it('reset reinicia el recorrido y el historial', async () => {
    await answer('A1', 'A1-b');
    const res = await api().post('/api/journey/reset').expect(200);
    expect(res.body.currentStep.activity.id).toBe('A1');
    expect((await api().get('/api/journey/attempts')).body.attempts).toHaveLength(0);
  });
});

describe('persistencia', () => {
  it('el progreso y el historial sobreviven a un reinicio de la aplicación', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-'));
    const file = path.join(dir, 'app.db');
    try {
      const first = buildApplication(file, { quiet: true });
      await request(first.app).post('/api/journey/answers').send({ activityId: 'A1', optionId: 'A1-a' }).expect(201);
      first.db.close();

      const second = buildApplication(file, { quiet: true }); // re-seed idempotente
      const journey = (await request(second.app).get('/api/journey').expect(200)).body;
      expect(journey.phase).toBe('THEORY');
      expect(journey.currentStep.theory.id).toBe('T1');
      const attempts = (await request(second.app).get('/api/journey/attempts')).body.attempts;
      expect(attempts).toHaveLength(1);
      second.db.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
