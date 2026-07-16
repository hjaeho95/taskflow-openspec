from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.errors import AppError
from app.models import Task, Team, User
from app.security import TokenExpiredError, TokenInvalidError, decode_access_token


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AppError.token_expired()
    token = authorization.split(" ", 1)[1]
    try:
        user_id = decode_access_token(token)
    except TokenExpiredError:
        raise AppError.token_expired()
    except TokenInvalidError:
        raise AppError.token_expired()

    user = await db.get(User, user_id)
    if user is None:
        raise AppError.token_expired()
    return user


async def require_team_member(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Team:
    """Ensures current_user belongs to `team_id`. Returns the team (403 otherwise)."""
    team = await db.get(Team, team_id)
    if team is None or current_user.team_id != team_id:
        raise AppError.forbidden("이 팀의 멤버가 아닙니다")
    return team


async def get_task_or_404(task_id: int, db: AsyncSession = Depends(get_db)) -> Task:
    task = await db.get(Task, task_id)
    if task is None:
        raise AppError.not_found("태스크를 찾을 수 없습니다")
    return task
