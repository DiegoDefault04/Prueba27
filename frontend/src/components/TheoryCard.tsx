import type { Step } from '../api/types';

type TheoryStep = Extract<Step, { type: 'THEORY' }>;

interface Props {
  step: TheoryStep;
  busy: boolean;
  onContinue: (theoryId: string) => void;
}

export function TheoryCard({ step, busy, onContinue }: Props) {
  const { theory, topic } = step;
  return (
    <section className="card card--theory">
      <div className="card__badges">
        <span className="badge">{topic.title}</span>
        <span className="badge badge--theory">Contenido teórico</span>
      </div>

      <h2 className="card__title">{theory.title}</h2>

      <div className="theory">
        {theory.body.map((block, i) =>
          block.kind === 'equation' ? (
            <p key={i} className="theory__equation">
              {block.text}
            </p>
          ) : (
            <p key={i}>{block.text}</p>
          ),
        )}
      </div>

      <button className="btn btn--primary" disabled={busy} onClick={() => onContinue(theory.id)}>
        {busy ? 'Cargando…' : 'Continuar al refuerzo'}
      </button>
    </section>
  );
}
