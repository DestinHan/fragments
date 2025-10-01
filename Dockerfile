FROM node:22.15.0-alpine AS builder

ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_COLOR=false

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY ./src ./src
COPY ./tests/.htpasswd ./tests/.htpasswd

FROM node:22.15.0-alpine AS runtime

ENV NODE_ENV=production \
    PORT=8080 \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_COLOR=false

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/tests/.htpasswd ./tests/.htpasswd
COPY package*.json ./

RUN addgroup -S app && adduser -S app -G app
USER app

LABEL org.opencontainers.image.source="https://github.com/<YOUR_GH_USER>/fragments" \
      org.opencontainers.image.description="Fragments backend API" \
      org.opencontainers.image.licenses="UNLICENSED"

EXPOSE 8080


HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null 2>&1 || exit 1

CMD ["npm","start"]
