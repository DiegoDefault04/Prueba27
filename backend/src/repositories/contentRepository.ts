import type { Db } from '../db/connection';
import type { Activity, ActivityKind, Content, ContentType, Theory, Topic } from '../domain/types';

interface ContentRow {
  id: string;
  topic_id: string;
  type: ContentType;
  title: string | null;
  prompt: string | null;
  body: string | null;
}

interface OptionRow {
  id: string;
  label: string;
  is_correct: number;
}

export class ContentRepository {
  constructor(private readonly db: Db) {}

  listTopics(): Topic[] {
    return this.db
      .prepare('SELECT id, position, title FROM topics ORDER BY position')
      .all() as Topic[];
  }

  getTopicByPosition(position: number): Topic | undefined {
    return this.db
      .prepare('SELECT id, position, title FROM topics WHERE position = ?')
      .get(position) as Topic | undefined;
  }

  getTopicById(id: string): Topic | undefined {
    return this.db.prepare('SELECT id, position, title FROM topics WHERE id = ?').get(id) as
      | Topic
      | undefined;
  }

  getContentById(id: string): Content | undefined {
    const row = this.db.prepare('SELECT * FROM contents WHERE id = ?').get(id) as ContentRow | undefined;
    return row ? this.hydrate(row) : undefined;
  }

  getContentForTopic(topicId: string, type: ContentType): Content | undefined {
    const row = this.db
      .prepare('SELECT * FROM contents WHERE topic_id = ? AND type = ?')
      .get(topicId, type) as ContentRow | undefined;
    return row ? this.hydrate(row) : undefined;
  }

  private hydrate(row: ContentRow): Content {
    if (row.type === 'THEORY') {
      const theory: Theory = {
        type: 'THEORY',
        id: row.id,
        topicId: row.topic_id,
        title: row.title ?? '',
        body: JSON.parse(row.body ?? '[]'),
      };
      return theory;
    }
    const options = this.db
      .prepare('SELECT id, label, is_correct FROM options WHERE activity_id = ? ORDER BY position')
      .all(row.id) as OptionRow[];
    const activity: Activity = {
      type: row.type as ActivityKind,
      id: row.id,
      topicId: row.topic_id,
      prompt: row.prompt ?? '',
      options: options.map((o) => ({ id: o.id, label: o.label, isCorrect: o.is_correct === 1 })),
    };
    return activity;
  }
}
