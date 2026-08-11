import pytest

from app.models.star import Star
from app.models.tag import Tag
from app.models.user import User
from app.services import janitor


@pytest.mark.asyncio
async def test_finds_empty_and_unstarred(db_session):
    user = User(github_id=1, github_login="octocat")
    db_session.add(user)
    await db_session.flush()

    empty_star = Star(user_id=user.id, repo_id=1)  # no tags, no notes -> empty
    noted_star = Star(user_id=user.id, repo_id=2, notes="keep me")
    unstarred = Star(user_id=user.id, repo_id=3, notes="no longer starred on github")
    db_session.add_all([empty_star, noted_star, unstarred])
    await db_session.flush()

    result = await janitor.preview(db_session, user.id, current_repo_ids={2})
    assert result["empty_count"] == 1  # repo_id=1: no tags, no notes
    assert result["unstarred_count"] == 2  # repo_id=1 and repo_id=3 aren't in {2}
    assert result["total_to_delete"] == 2  # union of the two sets above

    deleted = await janitor.run(db_session, user.id, current_repo_ids={2})
    assert deleted == 2


@pytest.mark.asyncio
async def test_tagged_star_is_not_empty(db_session):
    user = User(github_id=2, github_login="hubot")
    db_session.add(user)
    await db_session.flush()

    tag = Tag(user_id=user.id, name="ml")
    star = Star(user_id=user.id, repo_id=1)
    star.tags.append(tag)
    db_session.add_all([tag, star])
    await db_session.flush()

    result = await janitor.preview(db_session, user.id, current_repo_ids={1})
    assert result["empty_count"] == 0
