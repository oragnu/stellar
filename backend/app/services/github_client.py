"""Async GitHub API client: GraphQL star fetch, REST README fetch, grant
revocation. All calls are made on behalf of a user with their (decrypted)
OAuth access token.
"""

from dataclasses import dataclass
from typing import Any

import httpx
import structlog

log = structlog.get_logger(__name__)

GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"
GITHUB_API_URL = "https://api.github.com"

STARRED_REPOS_QUERY = """
query StarredRepos($cursor: String, $perPage: Int!) {
  viewer {
    starredRepositories(
      first: $perPage
      after: $cursor
      orderBy: { field: STARRED_AT, direction: DESC }
    ) {
      totalCount
      pageInfo { endCursor hasNextPage }
      edges {
        starredAt
        node {
          databaseId
          nameWithOwner
          description
          url
          isArchived
          pushedAt
          defaultBranchRef { name }
          primaryLanguage { name }
          stargazerCount
          forkCount
          repositoryTopics(first: 5) { nodes { topic { name } } }
          releases(first: 1, orderBy: { field: CREATED_AT, direction: DESC }) {
            nodes { tagName }
          }
        }
      }
    }
  }
}
"""


class InvalidAccessTokenException(Exception):
    """Raised when GitHub rejects the stored access token (401)."""


@dataclass
class StarPage:
    edges: list[dict[str, Any]]
    end_cursor: str | None
    has_next_page: bool
    total_count: int


class GitHubClient:
    def __init__(self, access_token: str, http_client: httpx.AsyncClient | None = None):
        self._token = access_token
        self._client = http_client or httpx.AsyncClient(timeout=20.0)
        self._owns_client = http_client is None

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    def _headers(self, accept: str = "application/vnd.github+json") -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._token}",
            "Accept": accept,
            "User-Agent": "stellar-app",
        }

    async def fetch_stars(self, cursor: str | None = None, per_page: int = 75) -> StarPage:
        resp = await self._client.post(
            GITHUB_GRAPHQL_URL,
            headers=self._headers(),
            json={
                "query": STARRED_REPOS_QUERY,
                "variables": {"cursor": cursor, "perPage": per_page},
            },
        )
        if resp.status_code == 401:
            raise InvalidAccessTokenException("GitHub rejected the stored access token")
        resp.raise_for_status()
        payload = resp.json()
        if "data" not in payload or payload["data"] is None:
            log.error("github_graphql_error", errors=payload.get("errors"))
            raise RuntimeError(f"GitHub GraphQL returned no data: {payload.get('errors')}")

        starred = payload["data"]["viewer"]["starredRepositories"]
        return StarPage(
            edges=starred["edges"],
            end_cursor=starred["pageInfo"]["endCursor"],
            has_next_page=starred["pageInfo"]["hasNextPage"],
            total_count=starred["totalCount"],
        )

    async def fetch_readme_html(self, name_with_owner: str) -> str | None:
        resp = await self._client.get(
            f"{GITHUB_API_URL}/repos/{name_with_owner}/readme",
            headers=self._headers(accept="application/vnd.github.html+json"),
        )
        if resp.status_code == 404:
            return None
        if resp.status_code == 401:
            raise InvalidAccessTokenException("GitHub rejected the stored access token")
        resp.raise_for_status()
        return resp.text

    async def revoke_grant(self, client_id: str, client_secret: str) -> None:
        """Fully de-authorize the OAuth app's grant (not just end the local
        session) — used by DELETE /auth/account. Best-effort: a failure here
        should not block local account deletion.
        """
        try:
            resp = await self._client.request(
                "DELETE",
                f"{GITHUB_API_URL}/applications/{client_id}/grant",
                auth=(client_id, client_secret),
                json={"access_token": self._token},
                headers={"Accept": "application/vnd.github+json"},
            )
            if resp.status_code not in (204, 404):
                log.warning("github_revoke_grant_unexpected_status", status=resp.status_code)
        except httpx.HTTPError as exc:
            log.warning("github_revoke_grant_failed", error=str(exc))
