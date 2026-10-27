import type { Db } from './connection';
import type { SeedActivity, SeedTopic } from '../data/curriculum';
import { initialState } from '../domain/journey';

export const DEFAULT_STUDENT_ID = 'default';

function assertValid(topics: SeedTopic[]): void {
  for (const t of topics) {
    for (const a of [t.main, t.reinforcement]) {
      const correct = a.options.filter((o) => o.correct).length;
      if (correct !== 1) {
        throw new Error(`La actividad ${a.id} debe tener exactamente una opción correcta (tiene ${correct}).`);
      }
    }
  }
}

/**
 * Carga el temario de forma idempotente (upsert por id) y crea el estado inicial
 * del estudiante si no existe. Es seguro ejecutarlo en cada arranque: no toca
 * intentos ni el progreso existente.
 */
export function seedDatabase(db: Db, topics: SeedTopic[]): void {
  assertValid(topics);

  const upsertTopic = db.prepare(
    `INSERT INTO topics (id, position, title) VALUES (@id, @position, @title)
     ON CONFLICT(id) DO UPDATE SET position = excluded.position, title = excluded.title`,
  );
  const upsertActivity = db.prepare(
    `INSERT INTO contents (id, topic_id, type, prompt) VALUES (@id, @topicId, @type, @prompt)
     ON CONFLICT(id) DO UPDATE SET prompt = excluded.prompt`,
  );
  const upsertTheory = db.prepare(
    `INSERT INTO contents (id, topic_id, type, title, body) VALUES (@id, @topicId, 'THEORY', @title, @body)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, body = excluded.body`,
  );
  const upsertOption = db.prepare(
    `INSERT INTO options (id, activity_id, position, label, is_correct)
     VALUES (@id, @activityId, @position, @label, @isCorrect)
     ON CONFLICT(id) DO UPDATE SET position = excluded.position, label = excluded.label, is_correct = excluded.is_correct`,
  );
  const insertJourney = db.prepare(
    `INSERT OR IGNORE INTO journey (student_id, phase, topic_position, updated_at)
     VALUES (@studentId, @phase, @topicPosition, @now)`,
  );

  const seedActivity = (a: SeedActivity, topicId: string, type: string) => {
    upsertActivity.run({ id: a.id, topicId, type, prompt: a.prompt });
    a.options.forEach((o, i) =>
      upsertOption.run({
        id: o.id,
        activityId: a.id,
        position: i,
        label: o.label,
        isCorrect: o.correct ? 1 : 0,
      }),
    );
  };

  db.transaction(() => {
    topics.forEach((t, position) => {
      upsertTopic.run({ id: t.id, position, title: t.title });
      seedActivity(t.main, t.id, 'MAIN_ACTIVITY');
      upsertTheory.run({
        id: t.theory.id,
        topicId: t.id,
        title: t.theory.title,
        body: JSON.stringify(t.theory.body),
      });
      seedActivity(t.reinforcement, t.id, 'REINFORCEMENT_ACTIVITY');
    });

    insertJourney.run({
      studentId: DEFAULT_STUDENT_ID,
      ...initialState(),
      now: new Date().toISOString(),
    });
  })();
}
