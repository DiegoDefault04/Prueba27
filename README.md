# Ruta de aprendizaje · Matemáticas

Aplicación Full Stack (TypeScript · React · Node.js) en la que un estudiante avanza por un temario resolviendo actividades. El backend aplica reglas deterministas para decidir si avanza, revisa teoría o realiza un refuerzo.

- **Frontend:** React + Vite
- **Backend:** Node.js + Express + SQLite (`better-sqlite3`) + Zod
- **Pruebas:** Vitest + Supertest (lógica de negocio y API)

## Requisitos

| Opción | Requisitos |
| --- | --- |
| Docker (recomendada) | Docker y Docker Compose v2 |
| Local | Node.js ≥ 20 (probado con 22) y npm |

## Ejecución con Docker Compose

```bash
docker compose up --build
```

Abre **http://localhost:8080**. Para cambiar el puerto: `WEB_PORT=9000 docker compose up --build` (o define `WEB_PORT` en un `.env`, ver `.env.example`).

- La base de datos SQLite vive en el volumen `db-data`, por lo que **el progreso persiste al reiniciar** los contenedores.
- Para empezar de cero: `docker compose down -v` (borra el volumen) o usa el botón **Reiniciar recorrido** de la interfaz.

## Ejecución local (sin Docker)

En dos terminales:

```bash
# Terminal 1 · API (http://localhost:3001)
cd backend
npm install
npm run dev
```

```bash
# Terminal 2 · Frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

Abre **http://localhost:5173**. Vite redirige `/api` al backend (`VITE_API_TARGET` permite cambiar el destino).

## Variables de entorno

Todas tienen valor por defecto; no se necesita configurar nada para evaluar. Ver `.env.example`.

| Variable | Dónde | Por defecto | Descripción |
| --- | --- | --- | --- |
| `WEB_PORT` | Docker Compose | `8080` | Puerto público de la app |
| `PORT` | Backend | `3001` | Puerto de la API |
| `DATABASE_PATH` | Backend | `./data/app.db` | Archivo SQLite |
| `CORS_ORIGIN` | Backend | `*` | Origen permitido por CORS |

## Inicialización de datos

El temario (3 temas con actividad principal, teoría y refuerzo) está en `backend/src/data/curriculum.ts`. Se carga **automáticamente y de forma idempotente** al arrancar el backend (upsert por id: no borra intentos ni progreso). También puede ejecutarse manualmente:

```bash
cd backend && npm run seed
```

## Pruebas

```bash
cd backend
npm test            # 30 pruebas: reglas del dominio, API, errores y persistencia
npm run typecheck   # verificación de tipos
```

El frontend se valida con `cd frontend && npm run build` (typecheck + build).

## API

Base: `/api`. Los errores tienen el formato `{ "error": { "code": "...", "message": "..." } }`.

| Método y ruta | Descripción |
| --- | --- |
| `GET /api/journey` | Estado del recorrido: ruta de temas, progreso, paso actual (sin respuestas correctas) y siguiente paso |
| `POST /api/journey/answers` | `{ activityId, optionId }` → resultado + nuevo estado |
| `POST /api/journey/theory/acknowledge` | `{ theoryId }` → habilita el refuerzo tras consultar la teoría |
| `GET /api/journey/attempts` | Historial de intentos |
| `POST /api/journey/reset` | Reinicia recorrido e historial (utilidad para revisión) |
| `GET /api/health` | Healthcheck |

Códigos de error de negocio: `ACTIVITY_NOT_FOUND` (404), `THEORY_NOT_FOUND` (404), `INVALID_OPTION` (422), `ACTIVITY_NOT_AVAILABLE` (409), `THEORY_NOT_AVAILABLE` (409), `JOURNEY_COMPLETED` (409), `VALIDATION_ERROR` / `INVALID_JSON` (400), `INTERNAL_ERROR` (500).

## Estructura

```
backend/src/
  domain/        reglas puras del recorrido (sin I/O) y tipos
  repositories/  acceso a SQLite
  services/      orquestación + transacciones + DTOs públicos
  http/          Express: rutas, validación y mapeo de errores
  db/, data/     esquema, seed y datos iniciales
backend/test/    pruebas de dominio y de API
frontend/src/    React: componentes, hook de estado y cliente de API
```
