// src/auth/strategies.js
const passport = require('passport');
const { BasicStrategy } = require('passport-http');
const { Strategy: BearerStrategy } = require('passport-http-bearer');
const { CognitoJwtVerifier } = require('aws-jwt-verify');

// --- HTTP Basic strategy (로컬/Lab1-8 용) ---
passport.use(
  'http',
  new BasicStrategy((email, password, done) => {
    if (!email || !password) {
      return done(null, false);
    }
    return done(null, email);
  })
);

// --- Cognito Bearer strategy (Lab9 용) ---
const userPoolId = process.env.AWS_COGNITO_POOL_ID;
const clientId = process.env.AWS_COGNITO_CLIENT_ID;

let verifier = null;

if (userPoolId && clientId) {
  verifier = CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    tokenUse: 'id',
  });
  console.log('[auth] Cognito verifier initialized', { userPoolId, clientId });
} else {
  console.warn(
    '[auth] AWS_COGNITO_POOL_ID / AWS_COGNITO_CLIENT_ID not set, bearer auth will always fail'
  );
}

// ✅ bearer 전략은 *항상* 등록되도록
passport.use(
  'bearer',
  new BearerStrategy(async (token, done) => {
    // verifier 가 없으면 그냥 인증 실패
    if (!verifier) {
      return done(null, false);
    }

    try {
      const payload = await verifier.verify(token);

      const user = {
        sub: payload.sub,
        email: payload.email,
      };

      return done(null, user);
    } catch (err) {
      console.warn('[auth] Token verification failed:', err?.message);
      return done(null, false);
    }
  })
);

// 이 파일은 전략 등록용이라 따로 export 할 건 없음
module.exports = {};
