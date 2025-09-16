# fragments

Fragments back-end API

## Description

A simple Node.js + Express back-end API for managing and serving fragments.  
This project was created as part of **CCP Lab 1 / Assignment 1**.

---

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/DestinHan/fragments.git
cd fragments
npm install
```

---

## Scripts

```bash
npm run lint # ESLint
npm test # Jest unit tests
npm run dev # node --env-file=debug.env --watch ./src/server.js
npm start # node src/server.js
npm run debug # inspector + watch
```

### Lint

```bash
npm run lint
```

### Start

```bash
npm start
```

### Dev

```bash
npm run dev
```

### Debug

```bash
npm run debug
```

---

## Health Check

When the server is running, visit:

```
http://localhost:8080
```

Expected JSON output:

```json
{
  "status": "ok",
  "author": "Seung Hoon Han",
  "githubUrl": "https://github.com/DestinHan/fragments",
  "version": "0.0.1"
}
```

## Authentication

HTTP Basic via Passport (Authorization: Basic base64(email:password))

All /v1/\* routes require authentication.

## Endpoints

POST /v1/fragments — create a text fragment (Content-Type: text/plain; charset=utf-8)
GET /v1/fragments — list fragment IDs (use ?expand=1 to get metadata objects)
GET /v1/fragments/:id — get raw fragment data

## CI
GitHub Actions workflow: .github/workflows/ci.yml
CI should be green.