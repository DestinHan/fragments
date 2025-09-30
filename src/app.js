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

// logging
app.use(pino);

// ⚠️ CORS는 라우터보다 "반드시 먼저" 등록
const corsOptions = {
  origin: ['http://localhost:1234', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
// Express 5: '*' 대신 정규식 사용
app.options(/.*/, cors(corsOptions));

app.use(helmet());
app.use(compression());
app.use(passport.initialize());

// Health/root
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

// Info
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

// API v1
app.use('/v1', v1);

// 404
app.use((req, res) => {
  res.status(404).json(createErrorResponse(404, 'not found'));
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'unable to process request';
  if (status > 499) logger.error({ err }, 'Error processing request');
  res.status(status).json(createErrorResponse(status, message));
});

module.exports = app;
