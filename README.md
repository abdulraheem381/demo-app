# Demo App

Simple 3-tier app for cloud demos.

## Run
1. `cd demo-app`
2. `docker compose up --build`
3. Open `http://localhost:3000`

## Switch to RDS
Edit `.env` with your RDS endpoint and set `DB_SSL=true`, then run:
`docker compose up --build frontend backend`