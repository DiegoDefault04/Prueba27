import { DomainError } from './errors';
import type { ActivityKind, AnswerOutcome, JourneyState } from './types';

/**
 * Reglas de selección del recorrido (funciones puras, sin I/O).
 *
 *   MAIN_ACTIVITY ──correcta──▶ MAIN_ACTIVITY (tema siguiente) | COMPLETED
 *        │
 *     incorrecta
 *        ▼
 *      THEORY ──consultada──▶ REINFORCEMENT_ACTIVITY ──correcta──▶ (tema siguiente | COMPLETED)
 *        ▲                              │
 *        └──────────incorrecta──────────┘
 */

export function initialState(): JourneyState {
  return { phase: 'MAIN_ACTIVITY', topicPosition: 0 };
}

/** Tipo de actividad evaluable que corresponde al paso actual (null si no hay). */
export function expectedActivityKind(state: JourneyState): ActivityKind | null {
  if (state.phase === 'MAIN_ACTIVITY' || state.phase === 'REINFORCEMENT_ACTIVITY') {
    return state.phase;
  }
  return null;
}

export interface Transition {
  state: JourneyState;
  outcome: AnswerOutcome;
}

/** Aplica el resultado de una respuesta a una actividad evaluable. */
export function applyAnswer(state: JourneyState, correct: boolean, totalTopics: number): Transition {
  if (state.phase === 'COMPLETED') {
    throw new DomainError('JOURNEY_COMPLETED', 'El temario ya fue completado.');
  }
  if (state.phase === 'THEORY') {
    throw new DomainError(
      'ACTIVITY_NOT_AVAILABLE',
      'Antes de responder debes consultar el contenido teórico.',
    );
  }

  if (!correct) {
    return { state: { phase: 'THEORY', topicPosition: state.topicPosition }, outcome: 'REVIEW_THEORY' };
  }

  const next = state.topicPosition + 1;
  if (next >= totalTopics) {
    return { state: { phase: 'COMPLETED', topicPosition: totalTopics }, outcome: 'COURSE_COMPLETED' };
  }
  return { state: { phase: 'MAIN_ACTIVITY', topicPosition: next }, outcome: 'TOPIC_COMPLETED' };
}

/** El estudiante consultó la teoría: puede pasar al refuerzo del mismo tema. */
export function applyTheoryRead(state: JourneyState): JourneyState {
  if (state.phase === 'COMPLETED') {
    throw new DomainError('JOURNEY_COMPLETED', 'El temario ya fue completado.');
  }
  if (state.phase !== 'THEORY') {
    throw new DomainError('THEORY_NOT_AVAILABLE', 'No hay teoría pendiente en el paso actual.');
  }
  return { phase: 'REINFORCEMENT_ACTIVITY', topicPosition: state.topicPosition };
}

export type TopicStatus = 'COMPLETED' | 'CURRENT' | 'LOCKED';

export function topicStatus(position: number, state: JourneyState): TopicStatus {
  if (position < state.topicPosition) return 'COMPLETED';
  if (position === state.topicPosition && state.phase !== 'COMPLETED') return 'CURRENT';
  return 'LOCKED';
}

export function completedTopics(state: JourneyState): number {
  return state.topicPosition;
}
