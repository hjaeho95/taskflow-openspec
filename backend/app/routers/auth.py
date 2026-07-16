import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.errors import AppError
from app.models import Team, User
from app.routers.teams import leave_current_team
from app.schemas import LoginRequest, SignupRequest, TokenResponse, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

FAILED_LOGIN_LOCK_THRESHOLD = 5
LOCKOUT_DURATION = timedelta(minutes=15)


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise AppError.email_taken()

    user = User(email=payload.email, password_hash=hash_password(payload.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == payload.email))

    if user is not None and user.deleted_at is None and user.locked_until is not None:
        remaining = (user.locked_until - datetime.utcnow()).total_seconds()
        if remaining > 0:
            raise AppError.account_locked(int(remaining))

    valid = (
        user is not None
        and user.deleted_at is None
        and verify_password(payload.password, user.password_hash)
    )
    if not valid:
        if user is not None and user.deleted_at is None:
            user.failed_login_count += 1
            if user.failed_login_count >= FAILED_LOGIN_LOCK_THRESHOLD:
                user.locked_until = datetime.utcnow() + LOCKOUT_DURATION
            await db.commit()
        raise AppError.invalid_credentials()

    user.failed_login_count = 0
    user.locked_until = None
    await db.commit()

    token = create_access_token(user.id)
    return TokenResponse(token=token, user=UserOut.model_validate(user))


@router.post("/logout")
async def logout():
    # Stateless: no server-side session/blacklist to clear.
    return {}


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft-deletes the account: anonymizes email/password so the address can be
    reused, and leaves/cascade-deletes the team (same rule as team-leave), so
    existing tasks/messages created by this user stay intact for teammates.
    """
    if current_user.team_id is not None:
        team = await db.get(Team, current_user.team_id)
        if team is not None:
            await leave_current_team(db, current_user, team)

    current_user.email = f"deleted-user-{current_user.id}@deleted.taskflow"
    current_user.password_hash = hash_password(secrets.token_urlsafe(32))
    current_user.deleted_at = datetime.utcnow()

    await db.commit()
    return {}
