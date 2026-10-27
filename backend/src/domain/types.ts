/**
 * Tipos del dominio. No dependen de HTTP ni de la base de datos.
 */

export type ActivityKind = 'MAIN_ACTIVITY' | 'REINFORCEMENT_ACTIVITY';
export type ContentType = ActivityKind | 'THEORY';

/** Fase en la que se encuentra el estudiante dentro del tema actual. */
export type Phase = 'MAIN_ACTIVITY' | 'THEORY' | 'REINFORCEMENT_ACTIVITY' | 'COMPLETED';

/**
 * Estado del recorrido. Es la única fuente de verdad del avance:
 * - `topicPosition`: índice (base 0) del tema actual. Cuando el temario
 *   está completo vale `totalTopics`.
 * - `phase`: qué tipo de paso toca dentro de ese tema.
 */
export interface JourneyState {
  phase: Phase;
  topicPosition: number;
}

export type AnswerOutcome = 'TOPIC_COMPLETED' | 'COURSE_COMPLETED' | 'REVIEW_THEORY';

export interface Topic {
  id: string;
  position: number;
  title: string;
}

export interface ActivityOption {
  id: string;
  label: string;
  /** Solo se usa en el backend. Nunca se serializa hacia el cliente. */
  isCorrect: boolean;
}

export interface Activity {
  type: ActivityKind;
  id: string;
  topicId: string;
  prompt: string;
  options: ActivityOption[];
}

export type TheoryBlock = { kind: 'text' | 'equation'; text: string };

export interface Theory {
  type: 'THEORY';
  id: string;
  topicId: string;
  title: string;
  body: TheoryBlock[];
}

export type Content = Activity | Theory;
