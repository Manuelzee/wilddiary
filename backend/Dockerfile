FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV APP_ENV=production

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . .

# Ensure data directory exists for persistent SQLite database
RUN mkdir -p /data && chmod 777 /data
ENV DATABASE_PATH=/data/wilddiary.db

EXPOSE 5000

# Run with tuned Gunicorn WSGI configuration
CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:app"]
