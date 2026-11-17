# Rally

A community-based social networking application built with React Native, Node.js, Express, and PostgreSQL.

## Features

* **Communities**: Create topic-focused spaces, join, and browse community discussions.
* **Posts & Media**: Publish text and image posts inside joined communities.
* **Voting & Karma**: Upvote/downvote posts and comments with atomic score and author karma tracking.
* **Threaded Discussions**: Nested comment replies with tombstone deletion support.
* **Feeds & Discovery**: Personalized Home feed, global Popular feed, and New/Top/Trending sorting.
* **Search**: Substring search across users, communities, and posts.

## Tech Stack

* **Mobile App**: React Native (Expo, Expo Router, TypeScript)
* **Backend**: Node.js, Express (REST API)
* **Database**: PostgreSQL
* **Authentication**: JWT & bcrypt

## Project Structure

```
rally/
├── client/         # React Native (Expo) mobile application
├── server/         # Node.js + Express REST API
├── docs/adr/       # Architecture Decision Records
└── GLOSSARY.md     # Domain vocabulary
```

## Getting Started

### Prerequisites

* Node.js 20+
* PostgreSQL 14+

### 1. Database Setup

```bash
createdb rally
psql -d rally -f server/src/db/schema.sql
```

### 2. Backend Setup

```bash
cd server
cp .env.example .env    # configure DATABASE_URL and JWT_SECRET
npm install
npm run dev
```

The API runs at `http://localhost:5001/api`.

Run automated tests:
```bash
npm test
```

### 3. Mobile App Setup

```bash
cd client
npm install
npm start
```
Use the interactive Expo CLI prompt to open on iOS (`i`), Android (`a`), or Expo Go.
