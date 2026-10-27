import type { Db } from '../db/connection';
import type { JourneyState, Phase } from '../domain/types';

export class JourneyRepository {
  constructor(private readonly db: Db) {}

  get(studentId: string): JourneyState {
    const row = this.db
      .prepare('SELECT phase, topic_position FROM journey WHERE student_id = ?')
      .get(studentId) as { phase: Phase; topic_position: number } | undefined;
    if (!row) throw new Error(`No existe el estado de recorrido para ${studentId}. ¿Se cargaron los datos iniciales?`);
    return { phase: row.phase, topicPosition: row.topic_position };
  }

  save(studentId: string, state: JourneyState): void {
    this.db
      .prepare('UPDATE journey SET phase = ?, topic_position = ?, updated_at = ? WHERE student_id = ?')
      .run(state.phase, state.topicPosition, new Date().toISOString(), studentId);
  }
}
