FROM node:20-alpine
WORKDIR /app

# Install git and Python with pip
RUN apk add --no-cache git python3 py3-pip

COPY . . 
# Create and use a venv (this is now the preferred way on Alpine)
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
# Install Python dependencies for harvest script
RUN pip3 install --no-cache-dir -r /app/requirements.txt

# Install build tools needed for better-sqlite3
RUN apk update && \
    apk add --no-cache --virtual .gyp-deps \
        python3 \
        make \
        g++ \
        sqlite-dev \
    && pip3 install --no-cache-dir -r /app/requirements.txt \
    && npm install --production \
    && apk del .gyp-deps
    
RUN npm install --production
RUN git config --global user.name "MTT Platform"
RUN git config --global user.email "mtt@localhost"
COPY . . 
EXPOSE 5000
CMD ["npm", "start"]