# Minimal Dockerfile for marine-frontend

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application files (node_modules excluded via .dockerignore)
COPY . ./

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_GITEA_URL
ARG VITE_DOMAIN
ARG VITE_ROOT_URL

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GITEA_URL=$VITE_GITEA_URL
ENV VITE_DOMAIN=$VITE_DOMAIN
ENV VITE_ROOT_URL=$VITE_ROOT_URL

# Build the application
RUN npm run build

EXPOSE 4173

CMD ["npx", "vite", "preview", "--host"]
