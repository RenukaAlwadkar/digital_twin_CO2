import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

# ── Neon PostgreSQL connection string ──
# Set the NEON_DATABASE_URL environment variable, or paste your connection string below.
NEON_URL = os.environ.get(
    "NEON_DATABASE_URL",
    "postgresql://neondb_owner:npg_iEy1FTz7nuLk@ep-still-queen-aqsba3nz-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
)

SQLITE_URL = "sqlite:///./eco_twin.db"


def _try_neon():
    """Try to connect to NeonDB. Returns engine if successful, None if network blocked."""
    try:
        engine = create_engine(
            NEON_URL,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 5},
        )
        # Quick connectivity test
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[DB] Connected to NeonDB (PostgreSQL)")
        return engine
    except Exception as e:
        print(f"[DB] NeonDB not reachable ({e.__class__.__name__}: {e})")
        print("     Falling back to local SQLite database.")
        return None


# Try Neon first, fallback to SQLite
_neon_engine = _try_neon()

if _neon_engine:
    engine = _neon_engine
    ACTIVE_DB = "NeonDB (PostgreSQL)"
else:
    engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
    ACTIVE_DB = "SQLite (local)"

print(f"[DB] Active database: {ACTIVE_DB}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
