// Contratos de la API (espejo de backend/src/services/dto.ts).

export type Phase = 'MAIN_ACTIVITY' | 'THEORY' | 'REINFORCEMENT_ACTIVITY' | 'COMPLETED';
export type TopicStatus = 'COMPLETED' | 'CURRENT' | 'LOCKED';
export type AnswerOutcome = 'TOPIC_COMPLETED' | 'COURSE_COMPLETED' | 'REVIEW_THEORY';

export interface TopicRef {
  id: string;
  position: number;
  title: string;
}

export type TheoryBlock = { kind: 'text' | 'equation'; text: string };

export type Step =
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

export interface Journey {
  status: 'IN_PROGRESS' | 'COMPLETED';
  phase: Phase;
  progress: { completedTopics: number; totalTopics: number; percent: number };
  roadmap: Array<TopicRef & { status: TopicStatus }>;
  currentStep: Step | null;
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
  journey: Journey;
}

export interface Attempt {
  id: number;
  activityId: string;
  activityKind: 'MAIN_ACTIVITY' | 'REINFORCEMENT_ACTIVITY';
  topicId: string;
  topicTitle: string;
  prompt: string;
  optionId: string;
  optionLabel: string;
  correct: boolean;
  createdAt: string;
}
