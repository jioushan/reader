FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js .
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
RUN mkdir -p /app/public/library
ENV PORT=40102
ENV LIBRARY_DIR=/app/public/library
EXPOSE 40102
CMD ["node", "server.js"]
