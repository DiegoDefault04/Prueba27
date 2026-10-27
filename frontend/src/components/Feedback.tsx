import type { AnswerResult } from '../api/types';

export function Feedback({ result, onDismiss }: { result: AnswerResult; onDismiss: () => void }) {
  return (
    <div className={`banner ${result.correct ? 'banner--success' : 'banner--warning'}`} role="status">
      <span>{result.feedback}</span>
      <button className="banner__close" onClick={onDismiss} aria-label="Cerrar mensaje">
        ×
      </button>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="banner banner--error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button className="btn btn--small" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
