# MediCompare WA

WhatsApp medicine price comparison with a browser simulator for Nairobi pharmacy
inventory. Seeded pharmacies, prices, and stock are illustrative demo data, not
live or verified pharmacy inventory.

## Run locally

```sh
npm ci
npx prisma db push
npm run db:seed
npm run dev
```

Open `http://localhost:3000/simulator`. The `/health` endpoint reports
PostgreSQL and Redis availability; Render uses `/live` as a fast process-only
liveness check so external dependency cold starts do not block deployment.

## Deploy on Render

This repository includes a Render Blueprint in `render.yaml`. Create a new
Blueprint from this GitHub repository and provide `DATABASE_URL` and `REDIS_URL`
as private environment variables in Render. Do not commit credentials or put
them in public configuration. The service builds with `npm run build`, starts
with `npm start`, and uses `/health` for its health check.
