FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app/ ./app/

# Cria usuario nao-root e da posse do diretorio /app + /data (volume Railway)
RUN useradd -m -u 1000 appuser \
    && mkdir -p /data \
    && chown -R appuser:appuser /app /data
USER appuser

ENV DB_PATH=/data/scores.db
EXPOSE 8000

# --proxy-headers + --forwarded-allow-ips='*' fazem o uvicorn ler X-Forwarded-For
# do edge do Railway, pra que slowapi.get_remote_address resolva o IP do cliente
# real (nao o IP unico do proxy, que agruparia todos os jogadores no mesmo bucket).
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
