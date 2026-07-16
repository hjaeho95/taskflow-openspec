from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user, get_task_or_404, require_team_member
from app.errors import AppError
from app.models import Task, Team, User
from app.schemas import (
    TaskCreateRequest,
    TaskOut,
    TaskStatusUpdateRequest,
    TaskUpdateRequest,
)

router = APIRouter(tags=["tasks"])


@router.get("/teams/{team_id}/tasks", response_model=list[TaskOut])
async def list_tasks(
    filter: str | None = Query(default=None, pattern="^(me|unassigned)$"),
    team: Team = Depends(require_team_member),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Task).where(Task.team_id == team.id)
    if filter == "me":
        stmt = stmt.where(Task.assignee_id == current_user.id)
    elif filter == "unassigned":
        stmt = stmt.where(Task.assignee_id.is_(None))
    stmt = stmt.order_by(Task.created_at.desc())

    result = (await db.scalars(stmt)).all()
    return [TaskOut.model_validate(t) for t in result]


@router.post("/teams/{team_id}/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreateRequest,
    team: Team = Depends(require_team_member),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = Task(
        team_id=team.id,
        title=payload.title,
        status="TODO",
        creator_id=current_user.id,
        assignee_id=payload.assignee_id,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return TaskOut.model_validate(task)


async def _require_task_team_membership(task: Task, current_user: User) -> None:
    if current_user.team_id != task.team_id:
        raise AppError.forbidden("이 팀의 멤버가 아닙니다")


@router.get("/tasks/{task_id}", response_model=TaskOut)
async def get_task(
    task: Task = Depends(get_task_or_404),
    current_user: User = Depends(get_current_user),
):
    await _require_task_team_membership(task, current_user)
    return TaskOut.model_validate(task)


@router.put("/tasks/{task_id}", response_model=TaskOut)
async def update_task(
    payload: TaskUpdateRequest,
    task: Task = Depends(get_task_or_404),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_task_team_membership(task, current_user)

    fields_set = payload.model_fields_set
    if "title" in fields_set and payload.title is not None:
        task.title = payload.title
    if "assignee_id" in fields_set:
        task.assignee_id = payload.assignee_id

    await db.commit()
    await db.refresh(task)
    return TaskOut.model_validate(task)


@router.patch("/tasks/{task_id}/status", response_model=TaskOut)
async def update_task_status(
    payload: TaskStatusUpdateRequest,
    task: Task = Depends(get_task_or_404),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_task_team_membership(task, current_user)
    task.status = payload.status
    await db.commit()
    await db.refresh(task)
    return TaskOut.model_validate(task)


@router.delete("/tasks/{task_id}")
async def delete_task(
    task: Task = Depends(get_task_or_404),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_task_team_membership(task, current_user)

    team = await db.get(Team, task.team_id)
    is_owner = team is not None and team.owner_id == current_user.id
    is_creator = task.creator_id == current_user.id
    if not (is_owner or is_creator):
        raise AppError.forbidden("삭제 권한이 없습니다")

    await db.delete(task)
    await db.commit()
    return {}
