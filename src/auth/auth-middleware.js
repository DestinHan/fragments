const passport = require('passport');

require('./strategies');

const { createErrorResponse } = require('../response');
const hash = require('../hash');
const logger = require('../logger');

/**
 * @param {'bearer' | 'http'} strategyName - the passport strategy to use
 * @returns {Function} - the middleware function to use for authentication
 */
module.exports = (strategyName) => {
  return function (req, res, next) {
    /**
     * Custom callback so we can unify user identity and handle errors ourselves.
     * @param {Error} err
     * @param {any} principal - for 'http' it's an email string, for 'bearer' it's a user object
     */
    function callback(err, principal) {
      // Internal error -> 500
      if (err) {
        logger.warn({ err }, 'error authenticating user');
        return res
          .status(500)
          .json(createErrorResponse(500, 'Unable to authenticate user'));
      }

      // No principal -> 401
      if (!principal) {
        return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
      }

      // Normalize identity
      let userId;
      let authObj;

      if (typeof principal === 'string') {
        // 'http' strategy: principal is the email
        const email = principal;
        userId = hash(email);                 // stable internal id
        authObj = { email, sub: userId };     // keep shape compatible with bearer (has .sub)
      } else {
        // 'bearer' strategy: principal is the user object from Cognito verification
        authObj = principal;
        // Prefer hashed email if present; otherwise use sub from token
        userId = principal.email ? hash(principal.email) : principal.sub;
      }

      if (!userId) {
        return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
      }

      // Expose unified identity
      req.userId = userId;    // use this in routes/models as the ownerId
      req.user = authObj;     // remains available for code expecting req.user.sub

      logger.debug({ strategy: strategyName, userId }, 'Authenticated user');
      next();
    }

    passport.authenticate(strategyName, { session: false }, callback)(req, res, next);
  };
};
