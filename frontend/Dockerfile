# Minimal Dockerfile for marine-frontend

FROM node:20-alpine

WORKDIR /app

COPY . ./
COPY package.json ./package.json
RUN rm Dockerfile

RUN npm install
RUN npm run build

EXPOSE 4173

CMD ["npx", "vite", "preview", "--host"]
