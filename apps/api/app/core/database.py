import logging
from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.core.config import settings

logger = logging.getLogger("linguamaxima.database")

class Base(DeclarativeBase):
    pass

_engine: AsyncEngine | None = None
_session_maker: async_sessionmaker[AsyncSession] | None = None
_using_sqlite_fallback: bool = False

from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

def normalize_db_url(url: str) -> str:
    if not url:
        return url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("sqlite://") and not url.startswith("sqlite+"):
        url = url.replace("sqlite://", "sqlite+aiosqlite://", 1)

    if "asyncpg" in url and "?" in url:
        parsed = urlparse(url)
        if parsed.query:
            query_params = parse_qs(parsed.query)
            clean_params = {}
            for k, val in query_params.items():
                if k == "sslmode":
                    mode = val[0] if isinstance(val, list) and val else str(val)
                    if mode in ("require", "verify-ca", "verify-full", "prefer"):
                        clean_params["ssl"] = ["require"]
                elif k == "ssl":
                    clean_params["ssl"] = val
                elif k in {"channel_binding", "target_session_attrs", "gssencmode"}:
                    continue
                else:
                    clean_params[k] = val
            new_query = urlencode(clean_params, doseq=True)
            url = urlunparse(parsed._replace(query=new_query))

    return url

def create_engine_instance(url: str) -> AsyncEngine:
    url = normalize_db_url(url)
    if url.startswith("sqlite"):
        return create_async_engine(
            url,
            echo=settings.debug,
            connect_args={"check_same_thread": False},
        )

    # In serverless environments (Vercel/Lambda/Supabase Pooler), use NullPool
    # to avoid holding persistent connections across stateless function invocations
    if settings.is_serverless or settings.db_use_null_pool:
        logger.info("Initializing PostgreSQL engine with NullPool for serverless execution.")
        return create_async_engine(
            url,
            echo=settings.debug,
            poolclass=NullPool,
            pool_pre_ping=True,
        )

    return create_async_engine(
        url,
        echo=settings.debug,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_pre_ping=True,
    )

def get_engine() -> AsyncEngine:
    global _engine, _using_sqlite_fallback
    if _engine is None:
        db_url = settings.sqlite_fallback_url if _using_sqlite_fallback else settings.database_url
        _engine = create_engine_instance(db_url)
    return _engine

def get_session_maker() -> async_sessionmaker[AsyncSession]:
    global _session_maker
    if _session_maker is None:
        engine = get_engine()
        _session_maker = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
        )
    return _session_maker

def switch_to_sqlite():
    global _engine, _session_maker, _using_sqlite_fallback
    if not _using_sqlite_fallback:
        logger.warning(f"Switching database engine to SQLite fallback: {settings.sqlite_fallback_url}")
        _using_sqlite_fallback = True
        _engine = create_engine_instance(settings.sqlite_fallback_url)
        _session_maker = async_sessionmaker(
            bind=_engine,
            class_=AsyncSession,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
        )

async def check_db_health() -> bool:
    try:
        session_maker = get_session_maker()
        async with session_maker() as session:
            result = await session.execute(text("SELECT 1"))
            return result.scalar() == 1
    except Exception as e:
        logger.warning(f"Primary DB connection check failed: {e}")
        if settings.use_sqlite_fallback and not _using_sqlite_fallback:
            switch_to_sqlite()
            try:
                session_maker = get_session_maker()
                async with session_maker() as session:
                    result = await session.execute(text("SELECT 1"))
                    return result.scalar() == 1
            except Exception as e2:
                logger.error(f"Fallback DB check failed: {e2}")
                return False
        return False

import asyncio

_db_initialized: bool = False
_db_init_lock = asyncio.Lock()

async def ensure_db_initialized() -> None:
    global _db_initialized
    if _db_initialized:
        return
    async with _db_init_lock:
        if not _db_initialized:
            await init_db()
            if settings.auto_seed_db:
                try:
                    from app.seeds.seed_data import seed_database
                    session_maker = get_session_maker()
                    async with session_maker() as session:
                        await seed_database(session)
                except Exception as e:
                    logger.error(f"Error during auto-seeding: {e}")
            _db_initialized = True

async def init_db() -> None:
    """Create tables on startup if auto_init_db is enabled."""
    if not settings.auto_init_db:
        logger.info("auto_init_db is disabled. Skipping startup table creation.")
        return

    # Ensure all ORM models are registered in Base.metadata
    import app.models  # noqa: F401

    try:
        engine = get_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema initialized successfully.")
    except Exception as e:
        logger.warning(f"Failed to init primary DB ({e}). Checking fallback...")
        if settings.use_sqlite_fallback:
            switch_to_sqlite()
            engine = get_engine()
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        else:
            raise

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database session in route handlers."""
    if not _db_initialized and settings.auto_init_db:
        try:
            await ensure_db_initialized()
        except Exception as e:
            logger.error(f"Lazy DB initialization error: {e}")

    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()