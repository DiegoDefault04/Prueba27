import { describe, expect, it } from 'vitest';
import { DomainError } from '../src/domain/errors';
import {
  applyAnswer,
  applyTheoryRead,
  completedTopics,
  expectedActivityKind,
  initialState,
  topicStatus,
} from '../src/domain/journey';
import type { JourneyState } from '../src/domain/types';

const TOTAL = 3;
const s = (phase: JourneyState['phase'], topicPosition: number): JourneyState => ({ phase, topicPosition });

describe('reglas del recorrido (dominio puro)', () => {
  it('empieza en la actividad principal del primer tema', () => {
    expect(initialState()).toEqual(s('MAIN_ACTIVITY', 0));
    expect(expectedActivityKind(initialState())).toBe('MAIN_ACTIVITY');
  });

  it('regla 1: principal correcta completa el tema y avanza a la principal del siguiente', () => {
    const t = applyAnswer(s('MAIN_ACTIVITY', 0), true, TOTAL);
    expect(t.state).toEqual(s('MAIN_ACTIVITY', 1));
    expect(t.outcome).toBe('TOPIC_COMPLETED');
  });

  it('regla 2: principal incorrecta lleva a la teoría del mismo tema', () => {
    const t = applyAnswer(s('MAIN_ACTIVITY', 1), false, TOTAL);
    expect(t.state).toEqual(s('THEORY', 1));
    expect(t.outcome).toBe('REVIEW_THEORY');
  });

  it('regla 3: tras consultar la teoría se habilita el refuerzo del mismo tema', () => {
    expect(applyTheoryRead(s('THEORY', 1))).toEqual(s('REINFORCEMENT_ACTIVITY', 1));
    expect(expectedActivityKind(s('REINFORCEMENT_ACTIVITY', 1))).toBe('REINFORCEMENT_ACTIVITY');
  });

  it('regla 4: refuerzo correcto completa el tema y avanza', () => {
    const t = applyAnswer(s('REINFORCEMENT_ACTIVITY', 0), true, TOTAL);
    expect(t.state).toEqual(s('MAIN_ACTIVITY', 1));
    expect(t.outcome).toBe('TOPIC_COMPLETED');
  });

  it('regla 5 y 6: refuerzo incorrecto regresa a la teoría, y el ciclo puede repetirse', () => {
    let state = s('REINFORCEMENT_ACTIVITY', 0);
    for (let i = 0; i < 4; i++) {
      const wrong = applyAnswer(state, false, TOTAL);
      expect(wrong.state).toEqual(s('THEORY', 0));
      state = applyTheoryRead(wrong.state);
      expect(state).toEqual(s('REINFORCEMENT_ACTIVITY', 0));
    }
    expect(applyAnswer(state, true, TOTAL).state).toEqual(s('MAIN_ACTIVITY', 1));
  });

  it('regla 9: completar el último tema completa el temario (desde principal o refuerzo)', () => {
    for (const phase of ['MAIN_ACTIVITY', 'REINFORCEMENT_ACTIVITY'] as const) {
      const t = applyAnswer(s(phase, TOTAL - 1), true, TOTAL);
      expect(t.state).toEqual(s('COMPLETED', TOTAL));
      expect(t.outcome).toBe('COURSE_COMPLETED');
    }
  });

  it('no se puede responder mientras hay teoría pendiente', () => {
    expect(() => applyAnswer(s('THEORY', 0), true, TOTAL)).toThrowError(
      expect.objectContaining({ code: 'ACTIVITY_NOT_AVAILABLE' }),
    );
  });

  it('no se puede responder ni consultar teoría con el temario completado', () => {
    expect(() => applyAnswer(s('COMPLETED', TOTAL), true, TOTAL)).toThrowError(
      expect.objectContaining({ code: 'JOURNEY_COMPLETED' }),
    );
    expect(() => applyTheoryRead(s('COMPLETED', TOTAL))).toThrowError(
      expect.objectContaining({ code: 'JOURNEY_COMPLETED' }),
    );
  });

  it('no se puede pasar al refuerzo sin estar en la teoría', () => {
    for (const phase of ['MAIN_ACTIVITY', 'REINFORCEMENT_ACTIVITY'] as const) {
      expect(() => applyTheoryRead(s(phase, 0))).toThrow(DomainError);
      expect(() => applyTheoryRead(s(phase, 0))).toThrowError(
        expect.objectContaining({ code: 'THEORY_NOT_AVAILABLE' }),
      );
    }
  });

  it('las funciones no mutan el estado de entrada', () => {
    const state = s('MAIN_ACTIVITY', 0);
    applyAnswer(state, false, TOTAL);
    expect(state).toEqual(s('MAIN_ACTIVITY', 0));
  });

  it('calcula estado de tema y progreso', () => {
    const state = s('THEORY', 1);
    expect([0, 1, 2].map((p) => topicStatus(p, state))).toEqual(['COMPLETED', 'CURRENT', 'LOCKED']);
    expect(completedTopics(state)).toBe(1);

    const done = s('COMPLETED', TOTAL);
    expect([0, 1, 2].map((p) => topicStatus(p, done))).toEqual(['COMPLETED', 'COMPLETED', 'COMPLETED']);
    expect(completedTopics(done)).toBe(TOTAL);
  });
});
