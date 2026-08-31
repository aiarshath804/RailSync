# RailSync Enterprise — Railway Corridor & Automatic Block Planning System

RailSync Enterprise is an AI-powered corridor optimization, timetable scheduling, and maintenance block planning control center for railway operations.

## Architecture Overview

1. **Python/FastAPI Backend (`/backend`)**:
   - Authoritative API Gateway, Analytics, Ingestion Adapters, and Optimization engine.
   - **OR-Tools CP-SAT & Heuristic Solver (`/backend/optimizer.py`, `/backend/core/constraint_engine.py`)**: Computes conflict-free maintenance blocks and cross-department task bundling with safety buffers and shadow-block detection.
   - **Ingestion Adapters (`/backend/adapters.py`, `/backend/adapters/`)**: Adapters for TMS (Track Management System), SMMS (Signals & Interlocking), TDMS (Traction & OHE), and COA (Control Office Application).
   - **Database (`/backend/database.py`, `/backend/database/`)**: SQLite/SQLAlchemy persistent schema storing Corridors, Assets, Train Schedules, Maintenance Requests, and Optimized Blocks.
   - **Real-Time SSE Server (`/backend/api/dashboard.py`)**: Streams live corridor state updates and event notifications to connected dispatchers.

2. **Frontend & Gateway Layer**:
   - **Express + Vite Reverse Proxy Gateway (`/server.ts`)**: Proxies `/api/*`, `/docs`, `/openapi.json` to the FastAPI backend while hosting the React 18 frontend on Port 3000.
   - **Frontend UI Client (`/src`)**: Interactive map, corridor topology graph, live Gantt chart, AI analytics, work order management, and manual/emergency override controls.

## API Endpoints

- `GET /api/v1/health`: System health, version, and solver status.
- `GET /api/v1/dashboard/metrics`: Key corridor performance metrics (saved block hours, asset availability, compliance).
- `GET /api/v1/dashboard/corridor-state`: Full operational state (assets, train schedules, maintenance requests, blocks).
- `GET /api/v1/dashboard/events`: Server-Sent Events (SSE) stream for live updates.
- `POST /api/v1/optimize/generate-plan`: Executes OR-Tools CP-SAT block planning and bundling engine.
- `POST /api/v1/optimize/emergency-replan`: Emergency replanning on section failure or disruption.
- `POST /api/v1/optimize/approve-block`: Dispatcher controller block approval/rejection.
- `DELETE /api/v1/optimize/delete-request/{id}`: Delete a maintenance request.
- `POST /api/v1/ingest/tms`: Ingest TMS civil engineering defects and track maintenance requests.
- `POST /api/v1/ingest/smms`: Ingest SMMS signal and interlocking faults.
- `POST /api/v1/ingest/tdms`: Ingest TDMS traction and overhead electrical (OHE) work requests.
- `POST /api/v1/ingest/coa`: Ingest COA train traffic schedules and timetables.
- `GET /api/v1/analytics/data`: Historic analytics, utilization distributions, and bundling performance.
- `POST /api/v1/insights/analyze`: AI operational analysis and recommendations.

## Running the Application

- **Development**:
  ```bash
  npm run dev
  ```
  This launches `server.ts`, which boots the authoritative FastAPI process and serves Vite on port 3000.

- **Production Build & Execution**:
  ```bash
  npm run build
  npm run start
  ```
