
FROM node:22.15.0

LABEL maintainer="Seung Hoon Han <myseneca>" \
      description="Fragments node.js microservice (Lab 5)"

ENV PORT=8080 \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_COLOR=false

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY ./src ./src

COPY ./tests/.htpasswd ./tests/.htpasswd

EXPOSE 8080

CMD ["npm","start"]
