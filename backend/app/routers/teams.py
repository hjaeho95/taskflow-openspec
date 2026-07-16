import random
import string

from fastapi import APIRouter, Depends, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user, require_team_member
from app.errors import AppError
from app.models import Team, User
from app.schemas import TeamCreateRequest, TeamJoinRequest, TeamMemberOut, TeamOut

router = APIRouter(prefix="/teams", tags=["teams"])


async def _generate_unique_invite_code(db: AsyncSession) -> str:
    for _ in range(20):
        letters = "".join(random.choices(string.ascii_uppercase, k=4))
        digits = "".join(random.choices(string.digits, k=4))
        code = f"{letters}-{digits}"
        existing = await db.scalar(select(Team).where(Team.invite_code == code))
        if existing is None:
            return code
    raise RuntimeError("failed to generate a unique invite code")


@router.post("", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
async def create_team(
    payload: TeamCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    invite_code = await _generate_unique_invite_code(db)
    team = Team(name=payload.name, invite_code=invite_code, owner_id=current_user.id)
    db.add(team)
    await db.flush()

    current_user.team_id = team.id
    await db.commit()
    await db.refresh(team)
    return TeamOut.model_validate(team)


@router.post("/join", response_model=TeamOut)
async def join_team(
    payload: TeamJoinRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    team = await db.scalar(select(Team).where(Team.invite_code == payload.invite_code))
    if team is None:
        raise AppError.not_found("해당 초대코드를 찾을 수 없습니다")

    if current_user.team_id is not None:
        raise AppError.conflict("ALREADY_IN_TEAM", "이미 다른 팀에 소속되어 있습니다")

    current_user.team_id = team.id
    await db.commit()
    await db.refresh(team)
    return TeamOut.model_validate(team)


@router.get("/{team_id}", response_model=TeamOut)
async def get_team(team: Team = Depends(require_team_member)):
    return TeamOut.model_validate(team)


@router.get("/{team_id}/members", response_model=list[TeamMemberOut])
async def list_members(
    team: Team = Depends(require_team_member),
    db: AsyncSession = Depends(get_db),
):
    members = (await db.scalars(select(User).where(User.team_id == team.id))).all()
    return [
        TeamMemberOut(
            id=m.id,
            email=m.email,
            role="owner" if m.id == team.owner_id else "member",
            joined_at=m.created_at,
        )
        for m in members
    ]


async def leave_current_team(db: AsyncSession, current_user: User, team: Team) -> None:
    """Removes current_user from `team`. Owner leaving cascade-deletes the whole
    team (design.md decision #8); Deleting the Team row cascades tasks/messages
    via ON DELETE CASCADE. Shared by the team-leave endpoint and account deletion.
    """
    if current_user.id == team.owner_id:
        remaining_member_ids = (
            await db.scalars(select(User.id).where(User.team_id == team.id))
        ).all()
        await db.delete(team)
        await db.flush()
        if remaining_member_ids:
            await db.execute(
                update(User).where(User.id.in_(remaining_member_ids)).values(team_id=None)
            )
    else:
        current_user.team_id = None


@router.delete("/{team_id}/leave", status_code=status.HTTP_200_OK)
async def leave_team(
    team: Team = Depends(require_team_member),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await leave_current_team(db, current_user, team)
    await db.commit()
    return {}
