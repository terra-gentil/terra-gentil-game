#!/bin/sh
set -e

# P1-G7-02 hotfix: o volume Railway monta /data em runtime descartando o
# chown do build. Container starta como root pra re-aplicar posse, depois
# dropa privileges pra appuser antes de exec uvicorn (mantem P1-G7-02 fechado).
chown -R appuser:appuser /data

exec su -p appuser -s /bin/sh -c "uvicorn app.main:app --host 0.0.0.0 --port \${PORT:-8000} --proxy-headers --forwarded-allow-ips='*' --no-access-log"
