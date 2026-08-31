import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

# PostgreSQL connection string using asyncpg driver
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://railsync_user:railsync_secure_password@localhost:5432/railsync"
)

# Async engine creation
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Declarative base model
Base = declarative_base()

# Dependency to get db session in FastAPI routes
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        # Create all tables in PostgreSQL
        await conn.run_sync(Base.metadata.create_all)
