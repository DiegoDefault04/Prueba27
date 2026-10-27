import type { Attempt } from '../api/types';

const KIND_LABEL = { MAIN_ACTIVITY: 'Principal', REINFORCEMENT_ACTIVITY: 'Refuerzo' } as const;

const formatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' });

export function History({ attempts }: { attempts: Attempt[] }) {
  return (
    <section className="history">
      <h3>Historial de intentos</h3>
      {attempts.length === 0 ? (
        <p className="muted">Aún no has enviado respuestas.</p>
      ) : (
        <ul>
          {[...attempts].reverse().map((a) => (
            <li key={a.id} className="history__item">
              <span className={`dot ${a.correct ? 'dot--ok' : 'dot--bad'}`} aria-hidden="true" />
              <div>
                <div>
                  <strong>{a.prompt}</strong> → {a.optionLabel}{' '}
                  <span className="muted">({a.correct ? 'correcta' : 'incorrecta'})</span>
                </div>
                <div className="muted small">
                  {a.topicTitle} · {KIND_LABEL[a.activityKind]} · {formatter.format(new Date(a.createdAt))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
