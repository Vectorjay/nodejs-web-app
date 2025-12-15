FROM node:18-alpine

# Create and set working directory
WORKDIR /usr/src/app

# Install dependencies first (caching optimization)
COPY package*.json ./

# Copy application source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /usr/src/app
USER nodejs

# Expose port (matches your server.js PORT)
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]