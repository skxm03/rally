# Rally

> A Community-Based Social Networking Mobile Application built with React Native (Expo), Node.js, Express, and PostgreSQL.

## Project Structure

```
rally/
├── client/                     # React Native Expo mobile frontend (unconfigured / to be built)
│   ├── package.json
│   └── app.json
│
├── server/                     # Node.js + Express REST API (Modular structure)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js           # PostgreSQL pool
│   │   ├── db/
│   │   │   └── schema.sql      # Database schema (PRD tables)
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verification middleware
│   │   │   └── error.js        # Centralized error & 404 handler
│   │   ├── modules/            # Feature modules
│   │   │   ├── auth/           # Phase 1: Register, login, logout, me
│   │   │   │   ├── auth.routes.js
│   │   │   │   ├── auth.controller.js
│   │   │   │   ├── auth.service.js
│   │   │   │   ├── auth.repository.js
│   │   │   │   └── auth.utils.js
│   │   │   └── index.js        # Master /api router
│   │   ├── app.js              # Express app setup & middlewares
│   │   └── index.js            # Server entry point
│   ├── .env
│   ├── .env.example
│   └── package.json
└── README.md
```

## Running the Project

### 1. Backend Server
```bash
cd server
npm run dev
```
- API Base: `http://localhost:5001/api`
- Health check: `http://localhost:5001/api/health`

### 2. Frontend App
```bash
cd client
npm start
```
