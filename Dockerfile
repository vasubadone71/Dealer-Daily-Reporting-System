FROM node:18-alpine

WORKDIR /app

# Create a data directory for the persistent Docker volume
RUN mkdir -p /app/data

# Create a symlink so the unmodified db.js finds the database inside the persistent volume
RUN ln -s /app/data/database.sqlite /app/database.sqlite

# Install dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy backend source code
COPY backend/ ./backend/

WORKDIR /app/backend

EXPOSE 5000

CMD ["npm", "start"]
