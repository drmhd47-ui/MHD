FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY nexus_platform nexus_platform
COPY sql sql
COPY sources sources
RUN useradd --system --uid 10001 nexus && mkdir -p /data/raw && chown nexus /data/raw
USER nexus
EXPOSE 8000
CMD ["uvicorn", "--factory", "nexus_platform.api.app:create_app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
