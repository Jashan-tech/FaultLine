FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --no-fund --no-audit

COPY src ./src

ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]
