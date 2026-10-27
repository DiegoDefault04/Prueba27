import type { Db } from '../db/connection';
import { DEFAULT_STUDENT_ID } from '../db/seed';
import { DomainError } from '../domain/errors';
import {
  applyAnswer,
  applyTheoryRead,
  completedTopics,
  expectedActivityKind,
  initialState,
  topicStatus,
} from '../domain/journey';
import type { Activity, JourneyState, Theory, Topic } from '../domain/types';
import { AttemptRepository } from '../repositories/attemptRepository';
import { ContentRepository } from '../repositories/contentRepository';
import { JourneyRepository } from '../repositories/journeyRepository';
import type { AnswerResponse, AttemptDto, JourneyView, StepDto } from './dto';

const FEEDBACK = {
  TOPIC_COMPLETED: '¡Correcto! Completaste el tema y avanzas al siguiente.',
  COURSE_COMPLETED: '¡Correcto! Completaste el último tema: ¡terminaste el temario!',
  REVIEW_THEORY: 'Respuesta incorrecta. Revisa el contenido teórico antes de continuar.',
} as const;

/**
 * Orquesta repositorios + reglas del dominio. Cada operación que modifica estado
 * se ejecuta dentro de una transacción, de modo que intento y estado nunca
 * quedan desincronizados.
 */
export class JourneyService {
  constructor(
    private readonly db: Db,
    private readonly content: ContentRepository,
    private readonly journeys: JourneyRepository,
    private readonly attempts: AttemptRepository,
    private readonly studentId: string = DEFAULT_STUDENT_ID,
  ) {}

  getJourney(): JourneyView {
    return this.buildView(this.journeys.get(this.studentId));
  }

  getAttempts(): AttemptDto[] {
    return this.attempts.list(this.studentId).map(({ isCorrect, ...rest }) => ({
      ...rest,
      correct: isCorrect,
    }));
  }

  submitAnswer(activityId: string, optionId: string): AnswerResponse {
    return this.db.transaction((): AnswerResponse => {
      const state = this.journeys.get(this.studentId);
      const totalTopics = this.content.listTopics().length;

      if (state.phase === 'COMPLETED') {
        throw new DomainError('JOURNEY_COMPLETED', 'El temario ya fue completado.');
      }

      const target = this.content.getContentById(activityId);
      if (!target || target.type === 'THEORY') {
        throw new DomainError('ACTIVITY_NOT_FOUND', `La actividad "${activityId}" no existe.`);
      }

      const current = this.currentActivity(state);
      if (!current || current.id !== target.id) {
        throw new DomainError(
          'ACTIVITY_NOT_AVAILABLE',
          'Esa actividad no corresponde al paso actual del recorrido.',
        );
      }

      const option = current.options.find((o) => o.id === optionId);
      if (!option) {
        throw new DomainError('INVALID_OPTION', `La opción "${optionId}" no existe en esta actividad.`);
      }

      const { state: nextState, outcome } = applyAnswer(state, option.isCorrect, totalTopics);
      const attemptId = this.attempts.insert(this.studentId, current.id, option.id, option.isCorrect);
      this.journeys.save(this.studentId, nextState);

      return {
        result: {
          attemptId,
          activityId: current.id,
          selectedOptionId: option.id,
          correct: option.isCorrect,
          outcome,
          feedback: FEEDBACK[outcome],
        },
        journey: this.buildView(nextState),
      };
    })();
  }

  /** El estudiante terminó de consultar la teoría: habilita el refuerzo del tema. */
  acknowledgeTheory(theoryId: string): JourneyView {
    return this.db.transaction((): JourneyView => {
      const state = this.journeys.get(this.studentId);
      if (state.phase === 'COMPLETED') {
        throw new DomainError('JOURNEY_COMPLETED', 'El temario ya fue completado.');
      }

      const target = this.content.getContentById(theoryId);
      if (!target || target.type !== 'THEORY') {
        throw new DomainError('THEORY_NOT_FOUND', `El contenido teórico "${theoryId}" no existe.`);
      }

      const topic = this.content.getTopicByPosition(state.topicPosition);
      if (state.phase !== 'THEORY' || !topic || target.topicId !== topic.id) {
        throw new DomainError('THEORY_NOT_AVAILABLE', 'Ese contenido teórico no corresponde al paso actual.');
      }

      const next = applyTheoryRead(state);
      this.journeys.save(this.studentId, next);
      return this.buildView(next);
    })();
  }

  /**
   * Reinicia el recorrido y borra el historial. Utilidad pensada para que quien
   * evalúe la prueba pueda repetir el flujo sin tocar la base de datos.
   */
  reset(): JourneyView {
    return this.db.transaction((): JourneyView => {
      const state = initialState();
      this.attempts.deleteAll(this.studentId);
      this.journeys.save(this.studentId, state);
      return this.buildView(state);
    })();
  }

  // ---------------------------------------------------------------- helpers

  private currentActivity(state: JourneyState): Activity | null {
    const kind = expectedActivityKind(state);
    const topic = this.content.getTopicByPosition(state.topicPosition);
    if (!kind || !topic) return null;
    const content = this.content.getContentForTopic(topic.id, kind);
    return content && content.type !== 'THEORY' ? content : null;
  }

  private buildView(state: JourneyState): JourneyView {
    const topics = this.content.listTopics();
    const total = topics.length;
    const done = completedTopics(state);

    return {
      status: state.phase === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
      phase: state.phase,
      progress: {
        completedTopics: done,
        totalTopics: total,
        percent: total === 0 ? 0 : Math.round((done / total) * 100),
      },
      roadmap: topics.map((t) => ({ ...t, status: topicStatus(t.position, state) })),
      currentStep: this.buildStep(state, topics),
      nextStepHint: this.buildHint(state, topics),
    };
  }

  private buildStep(state: JourneyState, topics: Topic[]): StepDto | null {
    const topic = topics.find((t) => t.position === state.topicPosition);
    if (state.phase === 'COMPLETED' || !topic) return null;

    const topicRef = { id: topic.id, position: topic.position, title: topic.title };

    if (state.phase === 'THEORY') {
      const theory = this.content.getContentForTopic(topic.id, 'THEORY') as Theory;
      return {
        type: 'THEORY',
        topic: topicRef,
        theory: { id: theory.id, title: theory.title, body: theory.body },
      };
    }

    const activity = this.content.getContentForTopic(topic.id, state.phase) as Activity;
    return {
      type: state.phase,
      topic: topicRef,
      activity: {
        id: activity.id,
        prompt: activity.prompt,
        // Se omite deliberadamente isCorrect.
        options: activity.options.map((o) => ({ id: o.id, label: o.label })),
      },
    };
  }

  private buildHint(state: JourneyState, topics: Topic[]): string {
    const next = topics.find((t) => t.position === state.topicPosition + 1);
    const onSuccess = next ? `avanzarás al tema «${next.title}»` : 'completarás el temario';

    switch (state.phase) {
      case 'MAIN_ACTIVITY':
        return `Si respondes correctamente ${onSuccess}; si no, revisarás la teoría del tema.`;
      case 'THEORY':
        return 'Después de leer la teoría continuarás con una actividad de refuerzo.';
      case 'REINFORCEMENT_ACTIVITY':
        return `Si respondes correctamente ${onSuccess}; si no, volverás a la teoría antes de otro intento.`;
      case 'COMPLETED':
        return '¡Has completado todo el temario!';
    }
  }
}
