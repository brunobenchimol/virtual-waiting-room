# Base image for Node.js
FROM node:18

# Set working directory inside the container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire application code
COPY . .

# Expose the port for app
EXPOSE 3000
EXPOSE 4000

# Entry point script for flexibility
CMD ["sh", "-c", "node $APP_ENTRY"]
