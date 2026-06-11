"""FastAPI app: router, lifespan (scheduler), healthcheck."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import HTMLResponse

from .config import settings
from .jobs import shutdown_scheduler, start_scheduler
from .routers import auth, reports, stream, users

_PAGE_PATH = Path(__file__).parent / "static" / "page.html"


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    try:
        yield
    finally:
        shutdown_scheduler()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(stream.router)
app.include_router(users.router)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/page", response_class=HTMLResponse, include_in_schema=False)
async def landing_page() -> str:
    """Landing page pubblica (one-page) servita su /page."""
    return _PAGE_PATH.read_text(encoding="utf-8")
