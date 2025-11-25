
# Minimal Dockerfile for marine-backend
FROM node:20-alpine

# Copy .env file
WORKDIR /app

COPY package.json ./
RUN npm install --production && npm install axios && npm install dotenv

COPY server.js ./

EXPOSE 5000

CMD ["npm", "start"]
