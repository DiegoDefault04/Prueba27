import type { AnswerResponse, Attempt, Journey } from './types';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Errores de conflicto indican que la pantalla quedó desfasada del estado real. */
  get isStateConflict(): boolean {
    return this.status === 409;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'No se pudo conectar con el servidor. Revisa tu conexión.', 0);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* respuesta sin JSON (p. ej. 502 de un proxy) */
  }

  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(
      err?.code ?? 'SERVER_ERROR',
      err?.message ?? 'Ocurrió un error en el servidor. Inténtalo de nuevo.',
      res.status,
    );
  }
  return body as T;
}

export const api = {
  getJourney: () => request<Journey>('/journey'),
  getAttempts: () => request<{ attempts: Attempt[] }>('/journey/attempts').then((r) => r.attempts),
  submitAnswer: (activityId: string, optionId: string) =>
    request<AnswerResponse>('/journey/answers', {
      method: 'POST',
      body: JSON.stringify({ activityId, optionId }),
    }),
  acknowledgeTheory: (theoryId: string) =>
    request<Journey>('/journey/theory/acknowledge', {
      method: 'POST',
      body: JSON.stringify({ theoryId }),
    }),
  reset: () => request<Journey>('/journey/reset', { method: 'POST' }),
};
