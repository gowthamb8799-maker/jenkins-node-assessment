FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev


FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules

COPY app.js ./

RUN rm -rf \
    /usr/local/lib/node_modules/npm \
    /opt/yarn-v1.22.22 && \
    mkdir -p /app/data && \
    chown -R node:node /app

ENV NODE_ENV=production

EXPOSE 3000

USER node

CMD ["node", "app.js"]
