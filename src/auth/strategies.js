// src/auth/strategies.js
const passport = require('passport');
const { BasicStrategy } = require('passport-http');
const { Strategy: BearerStrategy } = require('passport-http-bearer');
const { CognitoJwtVerifier } = require('aws-jwt-verify');

// --- HTTP Basic strategy (Lab 1~9용) ---
passport.use(
  'http',
  new BasicStrategy((email, password, done) => {
    if (!email || !password) {
      return done(null, false);
    }
    return done(null, email);
  })
);

// --- Cognito Bearer strategy ---
const userPoolId = process.env.AWS_COGNITO_POOL_ID;
const clientId = process.env.AWS_COGNITO_CLIENT_ID;

let verifier = null;

if (userPoolId && clientId) {
  verifier = CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    // ✅ UI가 Authorization 헤더로 보내는 건 id token 이라서
    //    access 말고 id 로 맞춰줘야 함
    tokenUse: 'id',
  });
  console.log('[auth] Cognito verifier initialized', { userPoolId, clientId });
} else {
  console.warn(
    '[auth] AWS_COGNITO_POOL_ID or AWS_COGNITO_CLIENT_ID missing — bearer auth disabled'
  );
}

passport.use(
  'bearer',
  new BearerStrategy(async (token, done) => {
    if (!verifier) {
      return done(null, false);
    }

    try {
      const payload = await verifier.verify(token);

      // payload 안에 email, sub 등 들어있음
      return done(null, { sub: payload.sub, email: payload.email });
    } catch (err) {
      console.warn('[auth] Token verification failed', err);
      return done(null, false);
    }
  })
);

// 이 파일은 side-effect(전략 등록)만 필요해서 굳이 passport 안 내보내도 됨
module.exports = {};
