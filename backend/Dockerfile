FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app/ ./app/
COPY entrypoint.sh /entrypoint.sh

# Cria usuario nao-root e da posse do diretorio /app + /data (volume Railway).
# O chown em /data e best-effort: o volume Railway sobrescreve permissoes em
# runtime, entao o entrypoint refaz o chown apos o mount. USER appuser foi
# removido: container starta como root pra entrypoint poder ajustar o volume,
# e dropa privileges pra appuser via `su -p` antes de exec uvicorn.
RUN useradd -m -u 1000 appuser \
    && mkdir -p /data \
    && chown -R appuser:appuser /app /data \
    && chmod +x /entrypoint.sh

ENV DB_PATH=/data/scores.db
EXPOSE 8000

# P2-G7-09: HEALTHCHECK pra docker run local. Em prod, Railway tem o proprio
# healthcheck definido em railway.toml apontando pra /health. Aqui usamos
# python stdlib pra evitar dep extra de curl/wget na imagem slim.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health',timeout=3).status==200 else 1)" || exit 1

# --proxy-headers + --forwarded-allow-ips='*' fazem o uvicorn ler X-Forwarded-For
# do edge do Railway, pra que slowapi.get_remote_address resolva o IP do cliente
# real (nao o IP unico do proxy, que agruparia todos os jogadores no mesmo bucket).
ENTRYPOINT ["/entrypoint.sh"]
