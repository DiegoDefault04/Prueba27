# DECISIONS

Documento breve con mi razonamiento sobre la prueba. No describe el funcionamiento de la app (eso está en el README).

## A. Decisiones técnicas

### 1. Guardar un estado explícito del recorrido y poner las reglas en funciones puras

**Problema.** Las reglas (principal → teoría → refuerzo → teoría → refuerzo…) tienen varias ramas y es fácil que acaben repartidas entre rutas HTTP, consultas SQL y el frontend. El enunciado además pide que el backend sea quien decide, así que necesitaba un único lugar donde vivieran las reglas y que fuera fácil de probar.

**Alternativas.** Consideré dos: (a) no guardar estado y deducirlo en cada petición a partir del historial de intentos, o (b) guardar un estado explícito.

**Por qué elegí (b).** Guardo `{ phase, topicPosition }`, donde `phase` puede ser `MAIN_ACTIVITY`, `THEORY`, `REINFORCEMENT_ACTIVITY` o `COMPLETED`. Las transiciones son dos funciones puras (`applyAnswer` y `applyTheoryRead` en `domain/journey.ts`) que reciben un estado y devuelven otro, sin tocar la base de datos. El servicio solo carga el estado, llama al dominio y persiste el resultado. Con (a) habría tenido que reconstruir cosas como "¿ya consultó la teoría después del último fallo?", y ese dato ni siquiera está en el historial de intentos.

**Compromisos.** Lo bueno: puedo probar las 9 reglas con pruebas unitarias sin servidor ni base de datos, y saber "qué toca ahora" es leer un campo. Lo malo: ahora hay dos fuentes de verdad (estado e historial) que podrían divergir. Lo mitigo guardando el intento y el nuevo estado dentro de la misma transacción de SQLite, de modo que o se guardan los dos o ninguno.

### 2. Un único modelo de contenido con tipo, en lugar de tablas por tipo

**Problema.** Las actividades (con opciones y una respuesta correcta) y la teoría (sin respuesta evaluable) se comportan distinto, pero las dos pertenecen a un tema y deben tratarse de forma consistente.

**Alternativas.** Tablas separadas para cada tipo, o un JSON grande por tema.

**Por qué elegí lo que elegí.** Usé una tabla `contents` con una columna `type` (`MAIN_ACTIVITY`, `THEORY`, `REINFORCEMENT_ACTIVITY`) y una restricción `UNIQUE(topic_id, type)` que garantiza un contenido de cada tipo por tema. Las opciones se relacionan solo con actividades. En TypeScript lo represento como una unión discriminada (`Activity | Theory`), y el frontend dibuja cada tipo con su propio componente. Tablas separadas me daban más rigidez pero tres veces el código de acceso a datos para esta prueba; un JSON por tema era lo más simple, pero perdía la integridad referencial (un intento podría apuntar a una opción que ya no existe).

**Compromisos.** Si mañana hay un tipo nuevo (por ejemplo un video), agregarlo es barato. A cambio, algunas columnas quedan en `NULL` según el tipo (`prompt` para actividades, `title` y `body` para teoría); lo controlo con un `CHECK` en la tabla para que no queden filas incoherentes.

### 3. Que las respuestas correctas no puedan filtrarse por diseño

**Problema.** Las respuestas correctas solo deben existir en el backend: no pueden viajar al cliente al consultar una actividad pendiente, ni el cliente debe decidir si acertó.

**Por qué elegí lo que elegí.** En lugar de confiar en acordarme de ocultar el campo en cada ruta, hice que el campo `isCorrect` exista solo en el modelo interno y que los DTOs públicos (`dto.ts`) simplemente no lo tengan. Además escribí una prueba que revisa que la respuesta JSON de `GET /api/journey` no contenga nada parecido a `isCorrect`. El cliente solo manda `activityId` y `optionId`; el servidor valida que esa actividad sea la del paso actual y que la opción le pertenezca, y responde con 404, 409 o 422 según el caso.

**Compromisos.** Cuando el estudiante falla, el sistema no le dice cuál era la correcta. Es deliberado, porque el refuerzo busca que lo razone tras leer la teoría, pero es una decisión de producto discutible (ver sección B).

## B. Reflexión de producto

**Limitación que identifico.** Cada tema tiene un solo refuerzo, con tres opciones. Eso significa que un estudiante que no entendió puede acertar por descarte: si falla, vuelve a la teoría, y en el siguiente intento ya sabe qué opciones no son. Con hasta dos intentos fallidos ya casi puede "adivinar" por eliminación, sin demostrar comprensión. Además, el ciclo teoría → refuerzo es ilimitado y siempre repite el mismo contenido, así que quien sigue sin entender puede quedarse atascado leyendo la misma explicación una y otra vez.

**Por qué me parece relevante.** El sistema da por completado un tema aunque el aprendizaje no haya ocurrido, y las decisiones posteriores (avanzar al tema siguiente) se apoyan en esa señal débil. Además, repetir la misma explicación frustra más que ayudar.

**Mejora que propondría.** Dos cambios pequeños: (1) varios refuerzos equivalentes por tema, que rotan sin repetirse, para que acertar exija resolver el ejercicio y no recordar la respuesta; y (2) que después de N fallos consecutivos el sistema ofrezca una explicación distinta (por ejemplo, un ejemplo resuelto paso a paso) en lugar de la misma teoría.

**Cómo lo validaría antes de implementarlo.** Haría un prototipo con 2 o 3 refuerzos para un solo tema y lo probaría con pocos estudiantes, o con un A/B simple. Mediría la tasa de acierto en la actividad principal del tema siguiente después de pasar por un refuerzo (si la mejora funciona, debería subir), el número de intentos hasta aprobar y el abandono. Si no se nota diferencia en el desempeño posterior, no valdría la pena el costo de crear más contenido.

## C. Uso de inteligencia artificial

**Herramientas.** Usé Claude (Claude Code) como asistente de desarrollo. No usé otras herramientas de IA.

**En qué me apoyé.** Le pedí un primer borrador de la estructura del proyecto, del frontend, de la configuración de Docker, de las pruebas y de los documentos. También lo usé para organizar ideas al redactar este archivo.

**Qué decidí yo.**
- El enfoque de estado explícito más funciones puras (decisión 1), después de entender por qué era preferible a derivar el estado del historial.
- Mantener el alcance acotado: SQLite en lugar de una base de datos externa, un solo estudiante y sin autenticación, tal como permite el enunciado.
- Que el backend sea la única autoridad sobre el resultado y que las respuestas correctas nunca salgan hacia el cliente.
- No invertir tiempo en pruebas automatizadas del frontend, y documentarlo como limitación.

**Cómo revisé y validé lo que generó.**
- Leí el código del dominio (`journey.ts`) y del servicio (`journeyService.ts`) hasta poder explicar cada transición y qué pasa en cada caso límite.
- Corrí las pruebas automatizadas (30 en total) y comprobé que cubrieran cada una de las 9 reglas del enunciado.
- Probé el flujo completo a mano en el navegador: acertar a la primera, fallar la principal, fallar el refuerzo varias veces, recargar la página y reiniciar el servidor para confirmar que el progreso persiste.
- Probé casos límite con `curl`: opción inexistente, responder una actividad que no corresponde al paso actual, responder el refuerzo sin pasar por la teoría y enviar respuestas después de terminar el temario.

**Propuestas de la IA que corregí o descarté.**
- La primera versión usaba `zod` 3, y `npm audit` reportó una vulnerabilidad de severidad alta en esa versión. Actualicé a la versión 4 y volví a correr pruebas y tipos para confirmar que todo seguía funcionando.
- La compilación del frontend falló porque faltaban los tipos de Node para `vite.config.ts`. Lo detectó el compilador de TypeScript y lo resolví instalando `@types/node` y ajustando `tsconfig.json`.
- La IA añadió un endpoint `reset` que no estaba en el enunciado. Lo conservé solo como comodidad para quien revise (poder repetir el flujo sin tocar la base de datos), pero lo documenté como utilidad de evaluación y no como parte del comportamiento pedido.
- No había probado `docker compose up --build` durante la generación del código, así que lo ejecuté yo en mi máquina antes de entregar. «COMPLETAR: cuéntalo solo si de verdad lo hiciste, y menciona si tuviste que corregir algo.»

## D. Autoevaluación

**Lo que considero bien resuelto.**
- Las reglas del recorrido están centralizadas en funciones puras y cubiertas por pruebas que no dependen de la base de datos.
- El intento y el nuevo estado se guardan en una misma transacción, por lo que no pueden quedar desincronizados.
- Los contratos de la API no filtran las respuestas correctas, y hay una prueba que lo verifica.
- La aplicación se levanta con un solo comando y el progreso persiste al reiniciar.

**Limitaciones y riesgos que reconozco.**
- Hay un solo estudiante y no existe autenticación (la tabla `journey` ya usa `student_id`, así que la puerta está abierta, pero no está implementado).
- "Consultar la teoría" se registra con un solo clic; no mido si realmente la leyó (el enunciado lo permite).
- No hay pruebas automatizadas del frontend.
- Con dos pestañas abiertas, una de ellas puede quedar desfasada; el backend responde 409 y el frontend recarga el estado, pero la experiencia podría ser más fina.
- El endpoint `reset` es una comodidad de revisión y no pertenecería tal cual a un sistema en producción.

**Qué mejoraría con más tiempo.**
- Pruebas de componentes y un flujo end-to-end con Playwright.
- Más de un refuerzo por tema, con rotación (la mejora de la sección B).
- Registrar el evento de "teoría consultada" en el historial.
- Migraciones formales de base de datos en lugar de crear las tablas al arrancar.

**Tiempo dedicado.** Aproximadamente «COMPLETAR: X» horas, repartidas entre entender el enunciado y diseñar el modelo, revisar y validar el código generado, probar a mano y corregir, y escribir la documentación.