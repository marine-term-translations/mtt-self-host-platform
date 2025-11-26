FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache git
COPY . . 
RUN npm install --production
COPY . . 
EXPOSE 5000
CMD ["npm", "start"]