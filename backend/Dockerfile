FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV APP_ENV=production

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . .

# Use /tmp for SQLite database (writable on Render free plan)
ENV DATABASE_PATH=/tmp/wilddiary.db

EXPOSE 10000

# Run with tuned Gunicorn WSGI configuration
CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:app"]
