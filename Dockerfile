FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Build the app
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV FINDMINE_CACHE_ENABLED=true
ENV FINDMINE_CACHE_TTL_MS=3600000

# Run the server
CMD ["node", "build/index.js"]