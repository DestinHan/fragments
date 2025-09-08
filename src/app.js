const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const passport = require('passport');
require('./auth/strategies');

const { author, version } = require('../package.json');

const logger = require('./logger');
const pino = require('pino-http')({ logger });

const v1 = require('./routes/v1');

const app = express();

app.use(pino);
app.use(helmet());
app.use(
  cors({
    origin: ['http://localhost:1234', 'http://localhost:3000'],
  })
);
app.use(compression());
app.use(passport.initialize());

// Health check
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json({
    status: 'ok',
    author,
    githubUrl: 'https://github.com/DestinHan/fragments',
    version,
  });
});

app.use('/v1', v1);

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: { message: 'not found', code: 404 },
  });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'unable to process request';
  if (status > 499) logger.error({ err }, 'Error processing request');
  res.status(status).json({ status: 'error', error: { message, code: status } });
});

module.exports = app;
