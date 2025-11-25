// src/auth/strategies.js
const passport = require('passport');
const { BasicStrategy } = require('passport-http');
const { Strategy: BearerStrategy } = require('passport-http-bearer');
const { CognitoJwtVerifier } = require('aws-jwt-verify');

// --- HTTP Basic strategy (Lab 1~9용, 로컬에서 씀) ---
passport.use(
  'http',
  new BasicStrategy((email, password, done) => {
    if (!email || !password) {
      return done(null, false);
    }
    // 단순히 email 만 사용자로 넘김
    return done(null, email);
  })
);

// --- Cognito Bearer strategy (ECS + Cognito 용) ---
const userPoolId = process.env.AWS_COGNITO_POOL_ID;
const clientId = process.env.AWS_COGNITO_CLIENT_ID;

let accessVerifier = null;
let idVerifier = null;

if (userPoolId && clientId) {
  // access token 검증기
  accessVerifier = CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    tokenUse: 'access',
  });

  // id token 검증기 (UI 가 id_token을 Authorization 에 넣는 경우 대비)
  idVerifier = CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    tokenUse: 'id',
  });

  console.log('[auth] Cognito verifiers initialized', { userPoolId, clientId });
} else {
  console.warn(
    '[auth] AWS_COGNITO_POOL_ID or AWS_COGNITO_CLIENT_ID missing — bearer auth disabled'
  );
}

passport.use(
  'bearer',
  new BearerStrategy(async (token, done) => {
    // verifier 자체가 없으면 무조건 실패
    if (!accessVerifier || !idVerifier) {
      console.warn('[auth] Bearer strategy used but verifiers not initialized');
      return done(null, false);
    }

    try {
      let payload;

      // 1) 먼저 access token 으로 검증 시도
      try {
        payload = await accessVerifier.verify(token);
        console.log('[auth] Verified Cognito access token');
      } catch (errAccess) {
        console.warn(
          '[auth] Access token verification failed, trying id token',
          errAccess.message || errAccess
        );

        // 2) 안 되면 id token 으로 다시 시도
        payload = await idVerifier.verify(token);
        console.log('[auth] Verified Cognito id token');
      }

      // payload 안에 있는 sub / email 을 user 로 넘김
      return done(null, { sub: payload.sub, email: payload.email });
    } catch (err) {
      console.warn('[auth] Token verification completely failed', err.message || err);
      return done(null, false);
    }
  })
);

// app.js 에서 require 했을 때 사이드 이펙트만 필요해서 굳이 passport 를 export 할 필요 없음
module.exports = {};
