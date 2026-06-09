#!/usr/bin/env bash
set -euo pipefail

echo "Attendo il database..."
python - <<'PY'
import asyncio, os, sys
import asyncpg

url = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")

async def wait():
    for attempt in range(30):
        try:
            conn = await asyncpg.connect(url)
            await conn.close()
            print("Database raggiungibile.")
            return
        except Exception as exc:  # noqa: BLE001
            print(f"  tentativo {attempt + 1}/30: {exc}")
            await asyncio.sleep(2)
    sys.exit("Database non raggiungibile, esco.")

asyncio.run(wait())
PY

echo "Applico le migrazioni Alembic..."
alembic upgrade head

echo "Avvio API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
