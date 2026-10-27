import { useState } from 'react';
import type { Step } from '../api/types';

type ActivityStep = Extract<Step, { activity: unknown }>;

interface Props {
  step: ActivityStep;
  busy: boolean;
  onSubmit: (activityId: string, optionId: string) => void;
}

export function ActivityCard({ step, busy, onSubmit }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const { activity, topic } = step;
  const isReinforcement = step.type === 'REINFORCEMENT_ACTIVITY';

  return (
    <section className="card">
      <div className="card__badges">
        <span className="badge">{topic.title}</span>
        <span className={`badge ${isReinforcement ? 'badge--reinforcement' : 'badge--main'}`}>
          {isReinforcement ? 'Actividad de refuerzo' : 'Actividad principal'}
        </span>
      </div>

      <h2 className="card__prompt">{activity.prompt}</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (selected) onSubmit(activity.id, selected);
        }}
      >
        <fieldset disabled={busy} className="options">
          <legend className="sr-only">Opciones de respuesta</legend>
          {activity.options.map((option) => (
            <label key={option.id} className={`option ${selected === option.id ? 'option--selected' : ''}`}>
              <input
                type="radio"
                name={activity.id}
                value={option.id}
                checked={selected === option.id}
                onChange={() => setSelected(option.id)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>

        <button type="submit" className="btn btn--primary" disabled={!selected || busy}>
          {busy ? 'Enviando…' : 'Enviar respuesta'}
        </button>
      </form>
    </section>
  );
}
