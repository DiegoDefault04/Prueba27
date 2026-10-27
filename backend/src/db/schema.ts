export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS topics (
  id        TEXT PRIMARY KEY,
  position  INTEGER NOT NULL UNIQUE,
  title     TEXT NOT NULL
);

-- Un solo tipo de tabla para todo el contenido, diferenciado por "type".
-- Las actividades usan "prompt" (+ options); la teoría usa "body" (JSON).
CREATE TABLE IF NOT EXISTS contents (
  id        TEXT PRIMARY KEY,
  topic_id  TEXT NOT NULL REFERENCES topics(id),
  type      TEXT NOT NULL CHECK (type IN ('MAIN_ACTIVITY','THEORY','REINFORCEMENT_ACTIVITY')),
  title     TEXT,
  prompt    TEXT,
  body      TEXT,
  UNIQUE (topic_id, type),
  CHECK (
    (type = 'THEORY' AND title IS NOT NULL AND body IS NOT NULL) OR
    (type <> 'THEORY' AND prompt IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS options (
  id           TEXT PRIMARY KEY,
  activity_id  TEXT NOT NULL REFERENCES contents(id),
  position     INTEGER NOT NULL,
  label        TEXT NOT NULL,
  is_correct   INTEGER NOT NULL CHECK (is_correct IN (0,1))
);

-- Estado del recorrido (un único estudiante; student_id deja la puerta abierta a varios).
CREATE TABLE IF NOT EXISTS journey (
  student_id      TEXT PRIMARY KEY,
  phase           TEXT NOT NULL CHECK (phase IN ('MAIN_ACTIVITY','THEORY','REINFORCEMENT_ACTIVITY','COMPLETED')),
  topic_position  INTEGER NOT NULL CHECK (topic_position >= 0),
  updated_at      TEXT NOT NULL
);

-- Historial inmutable de intentos.
CREATE TABLE IF NOT EXISTS attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id   TEXT NOT NULL,
  activity_id  TEXT NOT NULL REFERENCES contents(id),
  option_id    TEXT NOT NULL REFERENCES options(id),
  is_correct   INTEGER NOT NULL CHECK (is_correct IN (0,1)),
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempts_student ON attempts(student_id, id);
`;
