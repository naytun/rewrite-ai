# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20.18.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"
LABEL maintainer="RewriteAI"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"
ENV PORT=3000

# Install dependencies for production
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y curl && \
    rm -rf /var/lib/apt/lists/*

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install node modules
COPY package-lock.json package.json ./
RUN npm ci --include=dev

# Copy application code
COPY . .

# Build application
RUN npm run build

# Copy public files to dist directory
RUN rm -rf /app/dist/public && \
    mkdir -p /app/dist/public && \
    cp -r /app/src/public/* /app/dist/public/

# Remove development dependencies
RUN npm prune --omit=dev

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app/dist /app/dist
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json

# Create directory for novels and set permissions
RUN mkdir -p /app/Lightnovels

# Copy Lightnovels directory
COPY Lightnovels /app/Lightnovels

# Ensure node user owns the app directory and all contents
RUN chown -R node:node /app

# Use non-root user
USER node

# Required environment variables
ENV ORAMA_API_KEY=""
ENV ORAMA_ENDPOINT=""
ENV OPENAI_API_KEY=""
ENV ANTHROPIC_API_KEY=""

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the server by default, this can be overwritten at runtime
EXPOSE ${PORT}
CMD [ "npm", "run", "start" ]
