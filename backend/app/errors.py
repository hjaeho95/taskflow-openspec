from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str, meta: dict | None = None):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.meta = meta

    # Common factory helpers
    @classmethod
    def validation(cls, message: str = "올바른 형식이 아닙니다", meta: dict | None = None):
        return cls(400, "VALIDATION_ERROR", message, meta)

    @classmethod
    def too_long(cls, limit: int, actual: int):
        return cls(
            400,
            "TOO_LONG",
            f"{limit}자 이내로 입력하세요",
            {"limit": limit, "actual": actual},
        )

    @classmethod
    def invalid_credentials(cls):
        return cls(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 일치하지 않습니다")

    @classmethod
    def account_locked(cls, retry_after_seconds: int):
        return cls(
            423,
            "ACCOUNT_LOCKED",
            "로그인 시도가 너무 많아 잠시 후 다시 시도해주세요",
            {"retry_after_seconds": retry_after_seconds},
        )

    @classmethod
    def token_expired(cls):
        return cls(401, "TOKEN_EXPIRED", "인증이 만료되었습니다")

    @classmethod
    def forbidden(cls, message: str = "권한이 없습니다"):
        return cls(403, "FORBIDDEN", message)

    @classmethod
    def not_owner(cls, message: str = "본인의 항목만 삭제할 수 있습니다"):
        return cls(403, "NOT_OWNER", message)

    @classmethod
    def not_found(cls, message: str = "해당 항목을 찾을 수 없습니다"):
        return cls(404, "NOT_FOUND", message)

    @classmethod
    def email_taken(cls):
        return cls(409, "EMAIL_TAKEN", "이미 가입된 이메일입니다")

    @classmethod
    def conflict(cls, code: str, message: str):
        return cls(409, code, message)


async def app_error_handler(request: Request, exc: AppError):
    body = {"error": {"code": exc.code, "message": exc.message}}
    if exc.meta:
        body["error"]["meta"] = exc.meta
    return JSONResponse(status_code=exc.status_code, content=body)
