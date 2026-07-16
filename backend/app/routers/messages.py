from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user, require_team_member
from app.errors import AppError
from app.models import Message, Team, User
from app.schemas import MessageCreateRequest, MessageOut

router = APIRouter(tags=["messages"])


@router.get("/teams/{team_id}/messages", response_model=list[MessageOut])
async def list_messages(
    since: datetime | None = Query(default=None),
    team: Team = Depends(require_team_member),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Message, User.email).join(User, User.id == Message.user_id).where(
        Message.team_id == team.id
    )
    if since is not None:
        stmt = stmt.where(Message.created_at > since)
        stmt = stmt.order_by(Message.created_at.asc())
    else:
        stmt = stmt.order_by(Message.created_at.desc()).limit(50)

    rows = (await db.execute(stmt)).all()
    if since is None:
        rows = list(reversed(rows))

    return [
        MessageOut(
            id=m.id,
            team_id=m.team_id,
            user_id=m.user_id,
            user_email=email,
            content=m.content,
            created_at=m.created_at,
        )
        for m, email in rows
    ]


@router.post(
    "/teams/{team_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED
)
async def create_message(
    payload: MessageCreateRequest,
    team: Team = Depends(require_team_member),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if len(payload.content) > 1000:
        raise AppError.too_long(limit=1000, actual=len(payload.content))

    message = Message(team_id=team.id, user_id=current_user.id, content=payload.content)
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return MessageOut(
        id=message.id,
        team_id=message.team_id,
        user_id=message.user_id,
        user_email=current_user.email,
        content=message.content,
        created_at=message.created_at,
    )


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    message = await db.get(Message, message_id)
    if message is None:
        raise AppError.not_found("메시지를 찾을 수 없습니다")
    if current_user.team_id != message.team_id:
        raise AppError.forbidden("이 팀의 멤버가 아닙니다")
    if message.user_id != current_user.id:
        raise AppError.not_owner()

    await db.delete(message)
    await db.commit()
    return {}
