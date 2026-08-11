"""structlog configuration — structured JSON logs in production, readable
console output in local dev.
"""

import logging

import structlog

from app.config import Settings


def configure_logging(settings: Settings) -> None:
    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        # Never log secrets, even by accident.
        structlog.processors.CallsiteParameterAdder(
            {structlog.processors.CallsiteParameter.FUNC_NAME}
        ),
    ]

    renderer: structlog.typing.Processor
    if settings.app_env == "local":
        renderer = structlog.dev.ConsoleRenderer()
    else:
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


_REDACT_KEYS = {"access_token", "authorization", "secret_key", "secret_encryption_key"}


def redact(_, __, event_dict: dict) -> dict:
    for key in list(event_dict.keys()):
        if key.lower() in _REDACT_KEYS:
            event_dict[key] = "***redacted***"
    return event_dict
