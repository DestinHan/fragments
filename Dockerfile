FROM node:22.15.0-alpine AS builder


ENV NODE_ENV=production \
    PORT=8080 \
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

EXPOSE 8080
CMD ["npm","start"]
