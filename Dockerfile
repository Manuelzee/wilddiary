FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV APP_ENV=production

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

ENV DATABASE_PATH=/tmp/wilddiary.db

EXPOSE 10000

CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:app"]
