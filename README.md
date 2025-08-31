# fragments

Fragments back-end API

## Description

A simple Node.js + Express back-end API for managing and serving fragments.  
This project was created as part of **CCP Lab 1** to practice environment setup, linting, logging, and health check endpoints.

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
