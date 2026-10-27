import type { AnswerOutcome, Phase, TheoryBlock } from '../domain/types';
import type { TopicStatus } from '../domain/journey';

/** Contratos públicos de la API. Ningún DTO incluye `isCorrect`. */

export interface TopicRef {
  id: string;
  position: number;
  title: string;
}

export type StepDto =
  | {
      type: 'MAIN_ACTIVITY' | 'REINFORCEMENT_ACTIVITY';
      topic: TopicRef;
      activity: { id: string; prompt: string; options: Array<{ id: string; label: string }> };
    }
  | {
      type: 'THEORY';
      topic: TopicRef;
      theory: { id: string; title: string; body: TheoryBlock[] };
    };

export interface JourneyView {
  status: 'IN_PROGRESS' | 'COMPLETED';
  phase: Phase;
  progress: { completedTopics: number; totalTopics: number; percent: number };
  roadmap: Array<TopicRef & { status: TopicStatus }>;
  currentStep: StepDto | null;
  nextStepHint: string;
}

export interface AnswerResult {
  attemptId: number;
  activityId: string;
  selectedOptionId: string;
  correct: boolean;
  outcome: AnswerOutcome;
  feedback: string;
}

export interface AnswerResponse {
  result: AnswerResult;
  journey: JourneyView;
}

export interface AttemptDto {
  id: number;
  activityId: string;
  activityKind: string;
  topicId: string;
  topicTitle: string;
  prompt: string;
  optionId: string;
  optionLabel: string;
  correct: boolean;
  createdAt: string;
}
