FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN DATABASE_URL=postgresql://user:password@localhost:5432/trafficflow npm run db:generate && npm run build

EXPOSE 4000

CMD ["npm", "start"]
