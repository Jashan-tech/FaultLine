FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install --no-fund --no-audit

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-fund --no-audit

COPY --from=build /app/dist ./dist

EXPOSE 3001
CMD ["node", "dist/index.js"]
