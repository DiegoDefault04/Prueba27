import type { Journey } from '../api/types';

const STATUS_LABEL = { COMPLETED: 'Completado', CURRENT: 'En curso', LOCKED: 'Pendiente' } as const;

export function Roadmap({ journey }: { journey: Journey }) {
  const { progress, roadmap } = journey;
  return (
    <aside className="roadmap" aria-label="Ruta de aprendizaje">
      <h2>Tu ruta</h2>
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso del temario"
      >
        <div className="progress__fill" style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="roadmap__count">
        {progress.completedTopics} de {progress.totalTopics} temas completados
      </p>

      <ol className="roadmap__list">
        {roadmap.map((topic) => (
          <li key={topic.id} className={`topic topic--${topic.status.toLowerCase()}`}>
            <span className="topic__marker" aria-hidden="true">
              {topic.status === 'COMPLETED' ? '✓' : topic.position + 1}
            </span>
            <div>
              <div className="topic__title">{topic.title}</div>
              <div className="topic__status">{STATUS_LABEL[topic.status]}</div>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
