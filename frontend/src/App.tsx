import { ActivityCard } from './components/ActivityCard';
import { ErrorBanner, Feedback } from './components/Feedback';
import { History } from './components/History';
import { Roadmap } from './components/Roadmap';
import { TheoryCard } from './components/TheoryCard';
import { useJourney } from './useJourney';

export function App() {
  const j = useJourney();

  const confirmReset = () => {
    if (window.confirm('Esto reinicia tu recorrido y borra tu historial. ¿Continuar?')) void j.reset();
  };

  if (j.loading && !j.journey) {
    return <main className="center">Cargando tu recorrido…</main>;
  }

  if (!j.journey) {
    return (
      <main className="center">
        <ErrorBanner message={j.error ?? 'No se pudo cargar el recorrido.'} onRetry={() => void j.reload()} />
      </main>
    );
  }

  const { journey } = j;
  const step = journey.currentStep;

  return (
    <div className="layout">
      <header className="header">
        <div>
          <h1>Matemáticas · Ruta de aprendizaje</h1>
          <p className="muted">Resuelve actividades y recibe apoyo según tu desempeño.</p>
        </div>
        <button className="btn btn--ghost btn--small" onClick={confirmReset} disabled={j.busy}>
          Reiniciar recorrido
        </button>
      </header>

      <div className="grid">
        <Roadmap journey={journey} />

        <main className="main">
          {j.error && <ErrorBanner message={j.error} />}
          {j.feedback && <Feedback result={j.feedback} onDismiss={j.dismissFeedback} />}

          {step === null ? (
            <section className="card card--done">
              <h2>🎉 ¡Completaste el temario!</h2>
              <p>Terminaste los {journey.progress.totalTopics} temas. Revisa tu historial abajo.</p>
            </section>
          ) : step.type === 'THEORY' ? (
            <TheoryCard key={step.theory.id} step={step} busy={j.busy} onContinue={(id) => void j.acknowledgeTheory(id)} />
          ) : (
            <ActivityCard
              key={`${step.activity.id}-${j.attempts.length}`}
              step={step}
              busy={j.busy}
              onSubmit={(a, o) => void j.submitAnswer(a, o)}
            />
          )}

          <p className="hint">
            <strong>Siguiente paso:</strong> {journey.nextStepHint}
          </p>

          <History attempts={j.attempts} />
        </main>
      </div>
    </div>
  );
}
