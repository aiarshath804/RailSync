# 🚆 RailSync Enterprise

**AI-powered corridor optimization, timetable scheduling, and maintenance block planning control center for railway operations.**

RailSync ingests data from multiple railway subsystems, uses a constraint-programming solver to compute conflict-free maintenance blocks, and gives dispatchers a real-time operational dashboard to plan, approve, and react to disruptions across the network.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Sample Data](#sample-data)
- [API Endpoints](#api-endpoints)

---

## Overview

Indian Railways corridors are shared by trains, track maintenance crews, signal & interlocking teams, traction/OHE engineers, and control office scheduling — all of whom compete for the same track windows. RailSync unifies these data feeds into a single model of corridor state and uses an OR-Tools CP-SAT solver to automatically generate safe, non-conflicting maintenance blocks, bundle compatible work orders together, and re-plan instantly when something goes wrong (a failure, an emergency, a new defect).

A single Node/Express gateway boots and supervises the authoritative Python/FastAPI backend, proxies API traffic, and serves the React dashboard — so the whole system runs as one process in development or production.

## Key Features

- **AI/CP-SAT block optimizer** — computes conflict-free maintenance windows with safety buffers, shadow-block detection, and cross-department task bundling.
- **Multi-system ingestion adapters** — normalizes data from TMS (track), SMMS (signals & interlocking), TDMS (traction & OHE), and COA (train control/scheduling) into one corridor model.
- **Live operational dashboard** — interactive corridor map, network topology graph, Gantt-style schedule view, and real-time metrics.
- **Real-time updates** — Server-Sent Events (SSE) stream pushes corridor state and event notifications straight to connected dispatchers.
- **Emergency replanning** — recomputes the plan on demand when a section fails or a disruption occurs.
- **AI insights & analytics** — historic utilization analysis, bundling performance, and AI-generated operational recommendations.
- **Dispatcher workflow** — work order management plus manual/emergency override controls with approval/rejection of proposed blocks.

## Architecture

**1. Python/FastAPI Backend (`/backend`)**
- Authoritative API gateway, analytics engine, ingestion adapters, and optimization engine.
- **OR-Tools CP-SAT & heuristic solver** (`backend/optimizer.py`, `backend/core/constraint_engine.py`) — computes conflict-free maintenance blocks with safety buffers and shadow-block detection.
- **Ingestion adapters** (`backend/adapters.py`, `backend/adapters/`) — TMS, SMMS, TDMS, and COA payload parsers and normalizers.
- **Database layer** (`backend/database.py`, `backend/database/`) — SQLite/SQLAlchemy schema for corridors, assets, train schedules, maintenance requests, and optimized blocks.
- **Real-time SSE server** (`backend/api/`) — streams live corridor state and event notifications.
- **AI engine** (`backend/ai_engine.py`) — prioritization scoring for maintenance/work requests.
- **Prioritization & safety services** (`backend/services/`) — scenario running and safety guardrail checks exposed via dedicated routers.

**2. Frontend & Gateway Layer**
- **Express + Vite reverse-proxy gateway** (`server.ts`) — spawns and supervises the FastAPI process, proxies `/api/*`, `/docs`, and `/openapi.json` to it, and serves the React frontend on port 3000.
- **Frontend UI client** (`/src`) — interactive map, corridor topology graph, live Gantt chart, AI analytics views, work order management, and manual/emergency override controls.

```
┌─────────────────────┐        proxy /api, /docs        ┌──────────────────────────┐
│  React 19 Frontend   │ ───────────────────────────────▶ │  FastAPI Backend          │
│  (Vite, port 3000)   │ ◀─────────────────────────────── │  (Python, port 8000/5001) │
│  served by server.ts │        JSON / SSE                │  optimizer · adapters ·   │
└─────────────────────┘                                   │  AI engine · SQLite DB    │
                                                            └──────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4, lucide-react, Motion |
| Gateway | Node.js, Express 4, `http-proxy-middleware`, `tsx`/`esbuild` |
| Backend | Python, FastAPI, Pydantic |
| Optimization | Google OR-Tools (CP-SAT) |
| ML/Analytics | scikit-learn, NumPy |
| Database | SQLite (via SQLAlchemy), with optional PostgreSQL URL support |
| AI | Google Gemini API (`@google/genai` / `google-generativeai`) |

## Project Structure

```
RailSync/
├── backend/              # FastAPI application
│   ├── adapters.py       # TMS / SMMS / TDMS / COA ingestion
│   ├── ai_engine.py      # AI prioritization engine
│   ├── api/              # Routers (dashboard, prioritization, safety, etc.)
│   ├── core/             # Constraint engine and core solver logic
│   ├── database/         # DB schema & session management
│   ├── ml/                # ML models / training artifacts
│   ├── optimizer.py      # OR-Tools CP-SAT block optimizer
│   ├── pipeline/         # Data import pipeline service
│   ├── services/         # Prioritization & safety services
│   └── server.py         # FastAPI app entrypoint
├── src/                  # React frontend
│   ├── components/       # Dashboard views, modals, panels
│   ├── contexts/         # React context providers
│   ├── lib/              # Frontend utilities/API clients
│   └── App.tsx           # Root application component
├── data/                 # Sample TMS/SMMS/TDMS/COA datasets + ML training data
├── server.ts             # Express + Vite gateway, supervises the FastAPI process
├── package.json          # Frontend/gateway scripts & dependencies
└── .env.example          # Environment variable template
```

## Getting Started

### Prerequisites

- **Node.js** 18+ and a package manager (npm/bun — a `bun.lock` is present)
- **Python** 3.10+ with `pip`
- Python packages used by the backend include `fastapi`, `uvicorn`, `pydantic`, `sqlalchemy`, `ortools`, `numpy`, `scikit-learn`, and `google-generativeai` (no `requirements.txt` is checked in yet — install these, or generate one, before first run)

### Installation

```bash
git clone https://github.com/aiarshath804/RailSync.git
cd RailSync

# Frontend / gateway dependencies
npm install

# Backend dependencies
pip install fastapi uvicorn pydantic sqlalchemy ortools numpy scikit-learn google-generativeai python-multipart
```

### Configure environment

```bash
cp .env.example .env
# then edit .env with your keys (see below)
```

## Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | API key for Google Gemini, used by the AI insights/prioritization engine |
| `APP_URL` | Public URL the app is hosted at (used for self-referential links/callbacks) |
| `RAILRADAR_API_KEY` | Key for RailRadar live Indian Railways data integration |
| `TRAIN_API_KEY` | Secondary train-data API key |
| `FASTAPI_PORT` | Internal port for the Python/FastAPI backend (default `8000`) |
| `VITE_API_BASE_URL` | Frontend API base URL (empty string = relative proxying through the gateway) |
| `DATABASE_URL` | Optional database URL override (defaults to a local SQLite file via `backend/config.py`) |

## Running the Application

**Development**
```bash
npm run dev
```
Launches `server.ts`, which starts the authoritative FastAPI process (via `python3 backend/server.py`) and serves the Vite dev server on `http://localhost:3000`, proxying `/api`, `/docs`, and `/openapi.json` to the Python backend.

**Production**
```bash
npm run build
npm run start
```
Builds the Vite frontend and bundles `server.ts` with `esbuild`, then runs the compiled gateway which serves static assets and proxies API traffic.

**Type checking**
```bash
npm run lint
```

Once running, the interactive FastAPI docs are available at `/docs` and the OpenAPI schema at `/openapi.json`, both proxied through the gateway on port 3000.

## Sample Data

The `data/` directory contains synthetic sample datasets for local development and testing, covering corridors `NDLS-HWH-01`, `NDLS-CNB-07`, `CNB-MGS-01`, and `MGS-HWH-01`:

- `tms_sample.csv` — track defects and civil maintenance requests
- `smms_sample.csv` — signal & interlocking faults
- `tdms_sample.csv` — traction & OHE work requests
- `coa_sample.csv` — train schedules and timetables
- `railsync_ml_training_data.csv` — training data for the ML/prioritization models

## API Endpoints

All endpoints are served under `/api/v1` and proxied through the gateway on port 3000.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | System health, version, and solver status |
| `GET` | `/api/v1/dashboard/metrics` | Key corridor performance metrics (saved block hours, asset availability, compliance) |
| `GET` | `/api/v1/dashboard/corridor-state` | Full operational state (assets, train schedules, maintenance requests, blocks) |
| `GET` | `/api/v1/dashboard/events` | Server-Sent Events stream for live updates |
| `POST` | `/api/v1/optimize/generate-plan` | Executes the OR-Tools CP-SAT block planning and bundling engine |
| `POST` | `/api/v1/optimize/emergency-replan` | Emergency replanning on section failure or disruption |
| `POST` | `/api/v1/optimize/approve-block` | Dispatcher approval/rejection of a proposed block |
| `DELETE` | `/api/v1/optimize/delete-request/{id}` | Delete a maintenance request |
| `POST` | `/api/v1/ingest/tms` | Ingest TMS civil engineering defects and track maintenance requests |
| `POST` | `/api/v1/ingest/smms` | Ingest SMMS signal and interlocking faults |
| `POST` | `/api/v1/ingest/tdms` | Ingest TDMS traction and overhead electrical (OHE) work requests |
| `POST` | `/api/v1/ingest/coa` | Ingest COA train traffic schedules and timetables |
| `GET` | `/api/v1/analytics/data` | Historic analytics, utilization distributions, and bundling performance |
| `POST` | `/api/v1/insights/analyze` | AI operational analysis and recommendations |

---

*This README was generated from an inspection of the repository's source; verify environment/dependency details against your own deployment before relying on them.*
