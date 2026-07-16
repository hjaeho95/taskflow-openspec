import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

INVITE_CODE_RE = re.compile(r"^[A-Z]{4}-[0-9]{4}$")


# --- Auth ---


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    team_id: int | None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    token: str
    user: UserOut


# --- Team ---


class TeamCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=30)


class TeamJoinRequest(BaseModel):
    invite_code: str

    @field_validator("invite_code")
    @classmethod
    def validate_format(cls, v: str) -> str:
        if not INVITE_CODE_RE.match(v):
            raise ValueError("형식이 올바르지 않습니다 (예: ABCD-1234)")
        return v


class TeamOut(BaseModel):
    id: int
    name: str
    invite_code: str
    owner_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TeamMemberOut(BaseModel):
    id: int
    email: str
    role: str
    joined_at: datetime | None = None


# --- Tasks ---


class TaskCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    assignee_id: int | None = None


class TaskUpdateRequest(BaseModel):
    """Partial update. Use `model_fields_set` on the instance to tell apart
    an omitted field from one explicitly set to null (e.g. unassigning)."""

    title: str | None = Field(default=None, min_length=1, max_length=100)
    assignee_id: int | None = None


class TaskStatusUpdateRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ("TODO", "DOING", "DONE"):
            raise ValueError("status는 TODO/DOING/DONE 중 하나여야 합니다")
        return v


class TaskOut(BaseModel):
    id: int
    team_id: int
    title: str
    status: str
    creator_id: int
    assignee_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Messages ---


class MessageCreateRequest(BaseModel):
    # max_length intentionally NOT enforced here so the route can raise the
    # spec-mandated 400 TOO_LONG (with limit/actual meta) instead of a generic
    # VALIDATION_ERROR.
    content: str = Field(min_length=1)


class MessageOut(BaseModel):
    id: int
    team_id: int
    user_id: int
    user_email: str
    content: str
    created_at: datetime
