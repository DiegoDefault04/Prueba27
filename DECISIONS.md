# DECISIONS

> **BORRADOR.** Las secciones A y B reflejan decisiones reales tomadas en el código; revísalas y reescríbelas con tus palabras. Las secciones C y D **solo tú puedes completarlas** (uso de IA, tiempo, autoevaluación). Elimina esta nota antes de entregar.

## A. Decisiones técnicas

### 1. Máquina de estados explícita y pura, separada de HTTP y de la base de datos

**Problema.** Las reglas (principal → teoría → refuerzo → teoría…) son fáciles de dispersar entre rutas, SQL y frontend, y el enunciado exige que el backend sea la autoridad.

**Alternativas.** (a) Derivar el estado del historial de intentos en cada petición; (b) guardar un estado explícito.

**Decisión.** Guardo un estado explícito `{ phase, topicPosition }` con `phase ∈ {MAIN_ACTIVITY, THEORY, REINFORCEMENT_ACTIVITY, COMPLETED}`, y las transiciones viven en funciones puras (`applyAnswer`, `applyTheoryRead`) en `domain/journey.ts`. El servicio solo carga estado, llama al dominio y persiste.

**Compromisos.** Ventajas: las reglas se prueban sin base de datos ni servidor, y "qué toca ahora" es una lectura directa. Limitación: hay dos fuentes (estado e historial) que podrían divergir; lo mitigo guardando intento y nuevo estado en una **misma transacción**. Derivar del historial evitaba esa duplicidad, pero hacía más costoso y frágil razonar sobre la teoría pendiente.

### 2. Un modelo de contenido con tipo discriminado

**Problema.** Actividades (con opciones y respuesta correcta) y teoría (sin respuesta evaluable) se comportan distinto pero pertenecen al mismo tema.

**Decisión.** Tabla `contents` con `type` (`MAIN_ACTIVITY | THEORY | REINFORCEMENT_ACTIVITY`) y `UNIQUE(topic_id, type)`; las opciones se relacionan solo con actividades. En TypeScript es una unión discriminada (`Activity | Theory`), y el frontend renderiza cada tipo con su componente.

**Alternativas.** Tablas separadas por tipo (más estricto, más joins y código repetido para tres tipos) o un JSON único por tema (simple, pero pierde integridad referencial).

**Compromisos.** Añadir un tipo nuevo (p. ej. vídeo) es sencillo, pero algunas columnas son nulas según el tipo; lo controlo con un `CHECK`.

### 3. Seguridad de las respuestas correctas por construcción

**Problema.** Las respuestas correctas no deben llegar al cliente ni calcularse en él.

**Decisión.** `isCorrect` existe solo en el modelo interno; los DTOs públicos (`dto.ts`) no tienen ese campo y hay una prueba que verifica que la respuesta JSON no lo contiene. El backend valida además que la actividad sea la del paso actual y que la opción pertenezca a ella (409 / 422 / 404).

**Compromisos.** Al fallar, no se revela cuál era la correcta; es deliberado (el refuerzo busca que el estudiante lo razone), aunque podría ser una decisión de producto a revisar.

## B. Reflexión de producto

**Limitación.** Con una única pregunta de refuerzo por tema, un estudiante puede acertar por descarte o por memorización tras un par de intentos (son 3 opciones: ~33 % de acierto aleatorio), sin demostrar comprensión. Además, un ciclo teoría→refuerzo ilimitado sobre el mismo ejercicio puede frustrar a quien sigue sin entender.

**Mejora propuesta.** Un banco de varios refuerzos equivalentes por tema (rotación sin repetir), y tras N fallos consecutivos ofrecer una explicación alternativa o un ejemplo resuelto paso a paso en lugar de repetir la misma teoría.

**Cómo validarla.** Prototipo con 2–3 refuerzos por tema y un test A/B (o con pocos estudiantes) midiendo: tasa de acierto en el siguiente tema principal tras un refuerzo, número medio de intentos hasta aprobar y abandono. Si no mejora el desempeño posterior, no compensa el coste de crear contenido.

## C. Uso de inteligencia artificial

*(Completa con tu experiencia real. Sugerencia de puntos:)*

- Herramientas usadas: …
- En qué partes me apoyé: …
- Decisiones que tomé yo: …
- Cómo revisé/validé: ejecuté las pruebas, probé manualmente los casos límite, leí el código antes de entregarlo…
- Propuesta de la IA que corregí o descarté y por qué: …

## D. Autoevaluación

**Bien resuelto.** Reglas centralizadas y probadas; consistencia intento+estado transaccional; contratos de API que no filtran respuestas; persistencia y arranque con un solo comando.

**Limitaciones y riesgos.**
- Un único estudiante (la tabla `journey` ya usa `student_id`, pero no hay autenticación).
- "Consultar la teoría" se registra con un clic, sin medir lectura (permitido por el enunciado).
- No hay pruebas automatizadas del frontend.
- Dos pestañas abiertas pueden desfasarse; el backend responde 409 y el frontend recarga el estado.
- El endpoint `reset` es una comodidad de revisión y no tendría lugar tal cual en producción.

**Con más tiempo.** Pruebas de componentes/E2E (Playwright), múltiples refuerzos por tema, registro de eventos de teoría consultada, y migraciones formales de base de datos.

**Tiempo dedicado.** … horas *(complétalo tú)*.
