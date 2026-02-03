# 3-Tier Cloud Project Demo App

A simple 3-tier web app for cloud engineering demos.
- **Frontend**: Nginx serving static UI
- **Backend**: Node.js/Express API
- **Database**: PostgreSQL (Docker for local, RDS for cloud)

## Quick Start (Local Docker)
1. `cd three-tier-app`
2. `docker compose up --build`
3. Open `http://localhost:3000`
4. API health: `http://localhost:8080/api/health`

## Environment Files
- `three-tier-app/.env` contains default local values.
- `three-tier-app/.env.example` is a template you can copy and edit.

Key variables:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `DB_SSL` (set `true` for RDS)
- `DB_SSL_REJECT_UNAUTHORIZED` (set `false` if you are not using a CA bundle)

## RDS Setup (Switch from Docker DB)
1. Create a PostgreSQL RDS instance.
2. Update `three-tier-app/.env`:
   - `DB_HOST=<your-rds-endpoint>`
   - `DB_PORT=5432`
   - `DB_USER=<rds-username>`
   - `DB_PASSWORD=<rds-password>`
   - `DB_NAME=<rds-db-name>`
   - `DB_SSL=true`
   - `DB_SSL_REJECT_UNAUTHORIZED=false` (demo-friendly, use CA bundle in production)
3. Start only frontend and backend (optional):
   - `docker compose up --build frontend backend`
4. Ensure the RDS security group allows inbound traffic from your backend host.
   - If backend is local Docker, allow your local public IP.
   - If backend is on EC2/ECS/EKS, allow that security group.

## API Endpoints
- `GET /api/health`
- `GET /api/projects`
- `POST /api/projects`
  - JSON: `{ "name": "Project", "description": "...", "environment": "dev" }`

## Notes
- Local database is initialized with `db/init.sql`.
- The frontend proxies `/api` to the backend via Nginx.