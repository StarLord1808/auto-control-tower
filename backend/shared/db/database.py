"""
Database connection and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
import logging

from backend.shared.constants import DATABASE_URI

logger = logging.getLogger(__name__)

# Create database engine
engine = create_engine(
    DATABASE_URI,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Enable connection health checks
    echo=False,  # Set to True for SQL query logging
    connect_args={'connect_timeout': 5}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

# Create thread-safe session
db_session = scoped_session(SessionLocal)


def get_db():
    """
    Get database session for use in API endpoints
    Usage:
        db = get_db()
        try:
            # Your database operations
            db.commit()
        except Exception as e:
            db.rollback()
            raise
        finally:
            db.close()
    """
    return db_session()


@contextmanager
def get_db_context():
    """
    Context manager for database session
    Usage:
        with get_db_context() as db:
            # Your database operations
    """
    db = db_session()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database error: {str(e)}")
        raise
    finally:
        db.close()


def init_db():
    """
    Initialize database - create all tables
    """
    from backend.shared.db.models import Base
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")


def close_db():
    """
    Close database session
    """
    db_session.remove()
