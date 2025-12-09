FROM node:20-alpine
WORKDIR /app

# Install git and Python with pip
RUN apk add --no-cache git python3 py3-pip

# Copy requirements file for Python dependencies
COPY backend/requirements.txt /app/requirements.txt

# Install Python dependencies for harvest script
RUN pip3 install --no-cache-dir -r /app/requirements.txt

COPY . . 
RUN npm install --production
RUN git config --global user.name "MTT Platform"
RUN git config --global user.email "mtt@localhost"
COPY . . 
EXPOSE 5000
CMD ["npm", "start"]