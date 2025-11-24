// src/server.js
require('dotenv').config({ path: './debug.env' });

const stoppable = require('stoppable');
const logger = require('./logger');
const app = require('./app');

const port = parseInt(process.env.PORT || '8080', 10);

const server = stoppable(
  app.listen(port, () => {
    logger.info(`Server started on port ${port}`);
    console.log(`✅ Server running on port ${port}`);
    console.log(`💓 Health check available at: http://localhost:${port}/health`);
  })
);

module.exports = server;
