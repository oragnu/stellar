import pytest


@pytest.mark.asyncio
async def test_me_requires_auth(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_github_login_redirects(client):
    resp = await client.get("/api/v1/auth/github/login", follow_redirects=False)
    assert resp.status_code == 302
    assert "github.com/login/oauth/authorize" in resp.headers["location"]
    assert "stellar_oauth_state" in resp.cookies
