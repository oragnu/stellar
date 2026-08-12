"""Covers the SPA fallback bug found via a real Railway deploy (see
docs/plan.md Phase 5): a full-page landing on a client-side route like
/dashboard (e.g. the browser redirect at the end of the GitHub OAuth
callback) must serve the SPA's index.html, not a bare 404 — while a bogus
/api/v1/* path must still 404 as JSON, not silently serve the SPA.

Exercises app.main.SPAStaticFiles directly against a throwaway static
directory rather than the full app fixture, since backend/static only
exists after the frontend build step in docker/Dockerfile.
"""

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.main import SPAStaticFiles


@pytest.fixture
def spa_dir(tmp_path):
    (tmp_path / "index.html").write_text("<html><body>spa shell</body></html>")
    assets = tmp_path / "assets"
    assets.mkdir()
    (assets / "app.js").write_text("console.log('hi')")
    return tmp_path


@pytest.fixture
def spa_app(spa_dir):
    app = FastAPI()

    @app.get("/api/v1/health")
    async def health():
        return {"status": "ok"}

    app.mount("/", SPAStaticFiles(directory=spa_dir, html=True), name="spa")
    return app


@pytest.mark.asyncio
async def test_root_serves_index(spa_app):
    async with AsyncClient(transport=ASGITransport(app=spa_app), base_url="http://test") as client:
        resp = await client.get("/")
    assert resp.status_code == 200
    assert "spa shell" in resp.text


@pytest.mark.asyncio
async def test_client_route_falls_back_to_index(spa_app):
    """The bug: hard-landing on /dashboard (no such static file) used to
    404 instead of letting React Router take over client-side."""
    async with AsyncClient(transport=ASGITransport(app=spa_app), base_url="http://test") as client:
        resp = await client.get("/dashboard")
    assert resp.status_code == 200
    assert "spa shell" in resp.text


@pytest.mark.asyncio
async def test_real_asset_still_served_directly(spa_app):
    async with AsyncClient(transport=ASGITransport(app=spa_app), base_url="http://test") as client:
        resp = await client.get("/assets/app.js")
    assert resp.status_code == 200
    assert "console.log" in resp.text


@pytest.mark.asyncio
async def test_unknown_api_path_still_404s_as_json(spa_app):
    """A registered route always wins, but for a path FastAPI never matched
    at all (typo'd/retired API route) the static mount must not paper over
    it with the SPA shell."""
    async with AsyncClient(transport=ASGITransport(app=spa_app), base_url="http://test") as client:
        resp = await client.get("/api/v1/does-not-exist")
    assert resp.status_code == 404
    assert "spa shell" not in resp.text


@pytest.mark.asyncio
async def test_known_api_route_unaffected(spa_app):
    async with AsyncClient(transport=ASGITransport(app=spa_app), base_url="http://test") as client:
        resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
