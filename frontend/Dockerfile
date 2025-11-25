# Minimal Dockerfile for marine-frontend

FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY vite.config.js ./
COPY index.html ./
COPY src ./src

RUN npm install --production
RUN npm run build

EXPOSE 4173

CMD ["npx", "vite", "preview", "--host"]
