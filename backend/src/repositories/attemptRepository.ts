import type { Db } from '../db/connection';

export interface AttemptRecord {
  id: number;
  activityId: string;
  activityKind: string;
  topicId: string;
  topicTitle: string;
  prompt: string;
  optionId: string;
  optionLabel: string;
  isCorrect: boolean;
  createdAt: string;
}

export class AttemptRepository {
  constructor(private readonly db: Db) {}

  insert(studentId: string, activityId: string, optionId: string, isCorrect: boolean): number {
    const result = this.db
      .prepare(
        `INSERT INTO attempts (student_id, activity_id, option_id, is_correct, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(studentId, activityId, optionId, isCorrect ? 1 : 0, new Date().toISOString());
    return Number(result.lastInsertRowid);
  }

  list(studentId: string): AttemptRecord[] {
    const rows = this.db
      .prepare(
        `SELECT a.id, a.activity_id, c.type AS activity_kind, c.topic_id, t.title AS topic_title,
                c.prompt, a.option_id, o.label AS option_label, a.is_correct, a.created_at
         FROM attempts a
         JOIN contents c ON c.id = a.activity_id
         JOIN topics t ON t.id = c.topic_id
         JOIN options o ON o.id = a.option_id
         WHERE a.student_id = ?
         ORDER BY a.id ASC`,
      )
      .all(studentId) as Array<Record<string, unknown>>;

    return rows.map((r) => ({
      id: r.id as number,
      activityId: r.activity_id as string,
      activityKind: r.activity_kind as string,
      topicId: r.topic_id as string,
      topicTitle: r.topic_title as string,
      prompt: r.prompt as string,
      optionId: r.option_id as string,
      optionLabel: r.option_label as string,
      isCorrect: (r.is_correct as number) === 1,
      createdAt: r.created_at as string,
    }));
  }

  /** Solo para el reinicio de evaluación (ver JourneyService.reset). */
  deleteAll(studentId: string): void {
    this.db.prepare('DELETE FROM attempts WHERE student_id = ?').run(studentId);
  }
}
