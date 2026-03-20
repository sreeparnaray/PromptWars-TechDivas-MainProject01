# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Serve with FastAPI
FROM python:3.10-slim
WORKDIR /app/backend

# Install python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend project
COPY backend/ .

# Copy built frontend assets into the backend static folder
COPY --from=frontend-builder /app/frontend/dist ./static

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Command to run the unified server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
