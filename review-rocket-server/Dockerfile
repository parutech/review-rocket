# Use an official Node runtime as a parent image
FROM node:18-alpine
# Set the working directory to /app
WORKDIR /app
# Copy package.json and package-lock.json to the container
COPY package*.json ./
# Install dependencies
RUN npm install
# Copy the rest of the application code to the container
COPY . .
# Expose port 4000 to the outside world
EXPOSE 4000
# Run the command to start the server
CMD ["npm", "start"]