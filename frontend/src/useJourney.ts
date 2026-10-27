import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api/client';
import type { AnswerResult, Attempt, Journey } from './api/types';

interface State {
  journey: Journey | null;
  attempts: Attempt[];
  feedback: AnswerResult | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
}

/**
 * Hook que concentra el estado de servidor del recorrido.
 * El frontend nunca decide resultados: solo envía acciones y pinta la respuesta.
 */
export function useJourney() {
  const [state, setState] = useState<State>({
    journey: null,
    attempts: [],
    feedback: null,
    loading: true,
    busy: false,
    error: null,
  });

  const patch = (p: Partial<State>) => setState((s) => ({ ...s, ...p }));

  const load = useCallback(async () => {
    patch({ loading: true, error: null });
    try {
      const [journey, attempts] = await Promise.all([api.getJourney(), api.getAttempts()]);
      setState((s) => ({ ...s, journey, attempts, loading: false }));
    } catch (e) {
      patch({ loading: false, error: message(e) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Ejecuta una acción; si el servidor responde 409 la pantalla estaba desfasada y se recarga. */
  const run = async (action: () => Promise<void>) => {
    patch({ busy: true, error: null });
    try {
      await action();
      patch({ busy: false });
    } catch (e) {
      patch({ busy: false, error: message(e) });
      if (e instanceof ApiError && e.isStateConflict) {
        try {
          const [journey, attempts] = await Promise.all([api.getJourney(), api.getAttempts()]);
          patch({ journey, attempts, feedback: null });
        } catch {
          /* el error original ya está visible */
        }
      }
    }
  };

  const refreshAttempts = async () => {
    try {
      patch({ attempts: await api.getAttempts() });
    } catch {
      /* el historial es secundario */
    }
  };

  const submitAnswer = (activityId: string, optionId: string) =>
    run(async () => {
      const { result, journey } = await api.submitAnswer(activityId, optionId);
      patch({ journey, feedback: result });
      await refreshAttempts();
    });

  const acknowledgeTheory = (theoryId: string) =>
    run(async () => {
      const journey = await api.acknowledgeTheory(theoryId);
      patch({ journey });
    });

  const reset = () =>
    run(async () => {
      const journey = await api.reset();
      patch({ journey, attempts: [], feedback: null });
    });

  return {
    ...state,
    reload: load,
    submitAnswer,
    acknowledgeTheory,
    reset,
    dismissFeedback: () => patch({ feedback: null }),
  };
}

function message(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Ocurrió un error inesperado.';
}
