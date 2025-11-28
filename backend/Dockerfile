FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache git
COPY . . 
RUN npm install --production
RUN git config --global user.name "MTT Platform"
RUN git config --global user.email "mtt@localhost"
COPY . . 
EXPOSE 5000
CMD ["npm", "start"]