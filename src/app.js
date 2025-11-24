// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const passport = require('passport');
require('./auth/strategies');

const { author, version } = require('../package.json');

const logger = require('./logger');
const pino = require('pino-http')({ logger });
const { createSuccessResponse, createErrorResponse } = require('./response');

const v1 = require('./routes/v1');

const app = express();

// 공통 미들웨어
app.use(pino);

const corsOptions = {
  origin: ['http://localhost:1234', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Location', 'ETag', 'Content-Type'],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(helmet());
app.use(compression());
app.use(passport.initialize());

/**
 * 🔹 Health check (Docker HEALTHCHECK, CI에서 사용)
 *  - http://localhost:8080/health
 *  - 인증 필요 없음
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// --- Public (no auth) endpoints ---
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res
    .status(200)
    .json(
      createSuccessResponse({
        author,
        githubUrl: 'https://github.com/DestinHan/fragments',
        version,
      })
    );
});

// ✅ ALB / 과제용 v1 health (필요하면 사용)
app.get('/v1/health', (req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/v1/info', (req, res) => {
  res.status(200).json(
    createSuccessResponse({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      env: process.env.NODE_ENV || 'development',
    })
  );
});

// --- Protected (auth inside routes/v1) ---
app.use('/v1', v1);

// 404 핸들러 (이건 항상 마지막에!)
app.use((req, res) => {
  res.status(404).json(createErrorResponse(404, 'not found'));
});

// 🔴 Error handler (500대 에러는 콘솔 + logger 둘 다에 상세 출력)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'unable to process request';

  if (status >= 500) {
    // GitHub Actions 로그에서 보이도록 콘솔에도 찍기
    console.error('❌ Unhandled server error:', err);
    logger.error({ err }, 'Error processing request');
  }

  res.status(status).json(createErrorResponse(status, message));
});

module.exports = app;
