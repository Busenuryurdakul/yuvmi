# Yuvmi API

Go backend for Yuvmi MVP, built on [masterfabric-go](https://github.com/gurkanfikretgunak/masterfabric-go).

This directory contains the full masterfabric-go platform extended with Yuvmi domain modules (Future Self, Goals, Plans, Tasks, Check-ins, Alignment).

## Quick start

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Run migrations (requires goose)
make migrate

# 3. Run server
make run
```

Default: `http://localhost:8080`

## Yuvmi MVP endpoints

See Phase 1 routes under `/api/v1/` — auth via masterfabric IAM, product routes via Yuvmi handler.

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/v1/auth/register` | Public |
| POST | `/api/v1/auth/login` | Public |
| GET/PATCH | `/api/v1/me` | JWT |
| CRUD | `/api/v1/future-selfs/*` | JWT |
| CRUD | `/api/v1/goals/*`, `/api/v1/plans/*` | JWT |
| Daily | `/api/v1/tasks/*`, `/api/v1/checkins/*` | JWT |
| Metrics | `/api/v1/alignment/*` | JWT |

Response envelope: `{ "data": ... }` or `{ "error": { "message", "code" } }`

## Architecture

```text
apps/api/
├── cmd/server/           # masterfabric bootstrap + Yuvmi wiring
├── internal/
│   ├── application/yuvmi/
│   ├── domain/           # futureself, goal, profile, alignment
│   ├── infrastructure/
│   │   ├── http/handler/yuvmi/
│   │   └── postgres/     # Yuvmi repos + migrations 00013+
│   └── ...               # masterfabric IAM, tenant, gateway
```

Migrations `00013`–`00019` add Yuvmi tables on top of masterfabric schema.
