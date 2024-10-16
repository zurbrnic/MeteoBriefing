FROM ghcr.io/puppeteer/puppeteer:23.5.3


# Install dependencies for Chromium
RUN apt-get update && apt-get install -y chromium

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    # PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
    # PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .
CMD ["node", "./bin/www"]