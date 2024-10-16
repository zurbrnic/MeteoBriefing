FROM ghcr.io/puppeteer/puppeteer:23.5.3

# Switch to root user (if not already root)
USER root

# Install dependencies for Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libnss3 \
    libgconf-2-4 \
    libxss1 \
    libxi6 \
    libgdk-pixbuf2.0-0 \
    fonts-liberation \
    libappindicator3-1 \
    libx11-xcb1 \
    libxcomposite1 \
    libxrandr2 \
    libxcursor1 \
    libasound2 \
    libatk-bridge2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install pdftk and other necessary packages
RUN apt-get update && \
    apt-get install -y pdftk && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
    

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
    # PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
    # PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .
CMD ["node", "./bin/www"]