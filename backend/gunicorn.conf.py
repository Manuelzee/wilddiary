import multiprocessing
import os

# Server socket
bind = f"{os.getenv('HOST', '0.0.0.0')}:{os.getenv('PORT', '5000')}"
backlog = 2048

# Worker processes & threading optimized for concurrency
workers = int(os.getenv('WEB_CONCURRENCY', multiprocessing.cpu_count() * 2 + 1))
worker_class = "gthread"
threads = int(os.getenv('PYTHON_GETHREAD_THREADS', 4))
worker_connections = 1000
timeout = 30
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")

# Performance & memory hygiene
max_requests = 2000
max_requests_jitter = 200
preload_app = False
