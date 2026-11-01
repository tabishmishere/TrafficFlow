FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY docker-entrypoint.js ./
COPY prisma ./prisma
RUN DATABASE_URL=postgresql://trafficflow:build-only@localhost:5432/trafficflow npm run db:generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY docker-entrypoint.js ./
COPY prisma ./prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 4000
CMD ["node", "docker-entrypoint.js", "node", "dist/index.js"]
