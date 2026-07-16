from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.errors import AppError, app_error_handler
from app.routers import auth, messages, tasks, teams

app = FastAPI(title="TaskFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in first.get("loc", [])[1:])
    message = "올바른 형식이 아닙니다" + (f" ({field})" if field else "")
    return await app_error_handler(request, AppError.validation(message))


app.include_router(auth.router)
app.include_router(teams.router)
app.include_router(tasks.router)
app.include_router(messages.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
