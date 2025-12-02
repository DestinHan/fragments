module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',


    '!src/server.js',
    '!src/logger.js',

    '!src/auth/cognito.js',
    '!src/auth/basic-auth.js',
    '!src/auth/strategies.js',     
    '!src/model/data/aws/**/*.js',
  ],
};
