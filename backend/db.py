"""Database layer for WildDiary.

Two interchangeable backends behind one small API:

* **PostgreSQL** (production) - used whenever ``DATABASE_URL`` is set
  (e.g. a free Neon / Supabase database). Data lives outside the web server,
  so restarts and redeploys never wipe it.
* **SQLite** (local development / tests) - used when ``DATABASE_URL`` is not set.

Application code always writes SQLite-flavoured SQL with ``?`` placeholders;
``_translate`` converts it for PostgreSQL. Rows behave like ``sqlite3.Row``
(``row["col"]``, ``row[0]`` and ``dict(row)`` all work) on both backends.
"""
import logging
import os
import re
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB = BASE_DIR / "wilddiary.db"


_PG_SCHEMES = ("postgres://", "postgresql+psycopg://", "postgresql+psycopg2://")


def database_url():
    # Tolerate values pasted into a dashboard with surrounding quotes or spaces.
    url = os.getenv("DATABASE_URL", "").strip().strip("'\"").strip()
    # Some providers still hand out the legacy "postgres://" or SQLAlchemy-style schemes.
    for scheme in _PG_SCHEMES:
        if url.startswith(scheme):
            url = "postgresql://" + url[len(scheme):]
            break
    # Supabase only accepts encrypted connections.
    if "supabase." in url and "sslmode=" not in url:
        url += ("&" if "?" in url else "?") + "sslmode=require"
    return url


def is_postgres():
    return database_url().startswith("postgresql://")


def database_path():
    return Path(os.getenv("DATABASE_PATH", str(DEFAULT_DB))).resolve()


def backend_name():
    return "postgresql" if is_postgres() else "sqlite"


def describe_database():
    """Where data is stored, without credentials, for startup logs."""
    if not is_postgres():
        return f"sqlite ({database_path()})"
    from urllib.parse import urlsplit
    parts = urlsplit(database_url())
    return f"postgresql ({parts.hostname}:{parts.port or 5432}{parts.path})"


def require_persistent_database():
    """Prevent production from ever storing accounts on an ephemeral disk."""
    if os.getenv("APP_ENV", "development").lower() == "production" and not is_postgres():
        raw = os.getenv("DATABASE_URL", "").strip()
        hint = "it is not set" if not raw else f"it starts with {raw.split(':', 1)[0]!r}, not 'postgresql://'"
        raise RuntimeError(
            "DATABASE_URL must be set to a persistent PostgreSQL database (e.g. Supabase) in production; "
            f"{hint}. Refusing to start with temporary SQLite storage."
        )
    logging.getLogger("wilddiary").warning("Database: %s", describe_database())





# --------------------------------------------------------------------------- #
# Errors
# --------------------------------------------------------------------------- #
try:  # psycopg is only required when DATABASE_URL points at PostgreSQL.
    import psycopg
    from psycopg import errors as _pg_errors
    IntegrityError = (sqlite3.IntegrityError, _pg_errors.IntegrityError)
except ImportError:  # pragma: no cover - local SQLite-only installs
    psycopg = None
    IntegrityError = (sqlite3.IntegrityError,)


# --------------------------------------------------------------------------- #
# PostgreSQL adapter
# --------------------------------------------------------------------------- #
PG_NOW = "to_char(timezone('UTC', now()), 'YYYY-MM-DD HH24:MI:SS')"
_CURRENT_TS = re.compile(r"\bCURRENT_TIMESTAMP\b", re.IGNORECASE)
_LIKE = re.compile(r"\bLIKE\b")


def _translate(sql):
    """Convert SQLite-flavoured SQL into PostgreSQL SQL."""
    sql = sql.replace("%", "%%").replace("?", "%s")
    sql = _CURRENT_TS.sub(PG_NOW, sql)
    sql = _LIKE.sub("ILIKE", sql)  # SQLite LIKE is case-insensitive
    return sql


class Row(dict):
    """dict that also supports positional access like sqlite3.Row."""

    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)

    def keys(self):  # noqa: D401 - mirror sqlite3.Row
        return list(super().keys())


def _row_factory(cursor):
    names = [column.name for column in cursor.description or []]

    def make(values):
        return Row(zip(names, values))

    return make


class _PgCursor:
    def __init__(self, cursor, prefetched=None, lastrowid=None):
        self._cursor = cursor
        self._prefetched = prefetched
        self.lastrowid = lastrowid
        self.rowcount = cursor.rowcount

    def fetchone(self):
        if self._prefetched is not None:
            return self._prefetched[0] if self._prefetched else None
        return self._cursor.fetchone() if self._cursor.description else None

    def fetchall(self):
        if self._prefetched is not None:
            return list(self._prefetched)
        return self._cursor.fetchall() if self._cursor.description else []


class _PgConnection:
    """Gives a psycopg connection the subset of the sqlite3 API we use."""

    def __init__(self, raw):
        self.raw = raw

    def execute(self, sql, params=()):
        stripped = sql.lstrip().upper()
        translated = _translate(sql)
        is_insert = stripped.startswith("INSERT")
        if is_insert and "RETURNING" not in stripped:
            translated = translated.rstrip().rstrip(";") + " RETURNING *"
        cursor = self.raw.cursor(row_factory=_row_factory)
        cursor.execute(translated, tuple(params))
        if is_insert:
            rows = cursor.fetchall() if cursor.description else []
            lastrowid = rows[0].get("id") if rows else None
            return _PgCursor(cursor, prefetched=rows, lastrowid=lastrowid)
        return _PgCursor(cursor)

    def executemany(self, sql, seq):
        cursor = self.raw.cursor()
        cursor.executemany(_translate(sql), [tuple(p) for p in seq])
        return _PgCursor(cursor)

    def executescript(self, script):
        self.raw.execute(script)

    def commit(self):
        self.raw.commit()

    def rollback(self):
        self.raw.rollback()

    def close(self):
        _release_pg(self.raw)


_pool = None
_pool_lock = threading.Lock()


def _get_pool():
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                if psycopg is None:
                    raise RuntimeError("DATABASE_URL is set but psycopg is not installed. Run: pip install -r requirements.txt")
                from psycopg_pool import ConnectionPool
                _pool = ConnectionPool(
                    conninfo=database_url(),
                    min_size=1,
                    max_size=int(os.getenv("DB_POOL_SIZE", "5")),
                    kwargs={"autocommit": False, "prepare_threshold": None},
                    check=ConnectionPool.check_connection,
                    open=True,
                )
    return _pool


def _release_pg(raw):
    try:
        if raw.info.transaction_status != psycopg.pq.TransactionStatus.IDLE:
            raw.rollback()
    finally:
        _get_pool().putconn(raw)


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #
def get_connection():
    if is_postgres():
        return _PgConnection(_get_pool().getconn())
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=15)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA synchronous = NORMAL")
    connection.execute("PRAGMA cache_size = -16000")  # 16 MB page cache per connection
    connection.execute("PRAGMA temp_store = MEMORY")
    connection.execute("PRAGMA busy_timeout = 10000")  # 10s wait before busy error
    return connection


@contextmanager
def transaction():
    connection = get_connection()
    try:
        if not is_postgres():
            connection.execute("BEGIN IMMEDIATE")
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def fetch_all(query, params=()):
    connection = get_connection()
    try:
        return [dict(row) for row in connection.execute(query, params).fetchall()]
    finally:
        if is_postgres():
            connection.commit()
        connection.close()


def fetch_one(query, params=()):
    connection = get_connection()
    try:
        row = connection.execute(query, params).fetchone()
        return dict(row) if row else None
    finally:
        if is_postgres():
            connection.commit()
        connection.close()


def execute(query, params=()):
    with transaction() as connection:
        cursor = connection.execute(query, params)
        return {"lastrowid": cursor.lastrowid, "rowcount": cursor.rowcount}


# --------------------------------------------------------------------------- #
# Schema
# --------------------------------------------------------------------------- #
# Tables are listed once using placeholders, then rendered per backend:
#   {PK}  -> auto-increment integer primary key
#   {NOW} -> "current UTC timestamp as TEXT" default
#   {NOCASE} -> case-insensitive collation (SQLite only; PG uses lower() indexes)
_SCHEMA_TEMPLATE = """
CREATE TABLE IF NOT EXISTS users (
    id {PK},
    username TEXT NOT NULL {NOCASE} UNIQUE,
    email TEXT NOT NULL {NOCASE} UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'counselor', 'admin')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    token_version INTEGER NOT NULL DEFAULT 0,
    is_flagged INTEGER NOT NULL DEFAULT 0 CHECK(is_flagged IN (0, 1)),
    flag_reason TEXT,
    flagged_at TEXT,
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT {NOW},
    updated_at TEXT NOT NULL DEFAULT {NOW}
);
CREATE TABLE IF NOT EXISTS posts (
    id {PK},
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 5000),
    category TEXT NOT NULL CHECK(category IN ('emotional','financial','relationship','social','other')),
    is_anonymous INTEGER NOT NULL DEFAULT 1 CHECK(is_anonymous IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','under_review','flagged')),
    created_at TEXT NOT NULL DEFAULT {NOW}
);
CREATE TABLE IF NOT EXISTS comments (
    id {PK},
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 2000),
    is_anonymous INTEGER NOT NULL DEFAULT 0 CHECK(is_anonymous IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','under_review','flagged')),
    created_at TEXT NOT NULL DEFAULT {NOW}
);
CREATE TABLE IF NOT EXISTS reactions (
    id {PK},
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT {NOW},
    UNIQUE(post_id, user_id)
);
CREATE TABLE IF NOT EXISTS reports (
    id {PK},
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK(length(reason) BETWEEN 3 AND 500),
    created_at TEXT NOT NULL DEFAULT {NOW},
    UNIQUE(reporter_id, post_id)
);
CREATE TABLE IF NOT EXISTS comment_reports (
    id {PK},
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK(length(reason) BETWEEN 3 AND 500),
    created_at TEXT NOT NULL DEFAULT {NOW},
    UNIQUE(reporter_id, comment_id)
);
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    default_anonymous INTEGER NOT NULL DEFAULT 1 CHECK(default_anonymous IN (0, 1)),
    email_notifications INTEGER NOT NULL DEFAULT 1 CHECK(email_notifications IN (0, 1)),
    reaction_notifications INTEGER NOT NULL DEFAULT 1 CHECK(reaction_notifications IN (0, 1)),
    counselor_notifications INTEGER NOT NULL DEFAULT 1 CHECK(counselor_notifications IN (0, 1)),
    ai_support_enabled INTEGER NOT NULL DEFAULT 0 CHECK(ai_support_enabled IN (0, 1)),
    updated_at TEXT NOT NULL DEFAULT {NOW}
);
CREATE TABLE IF NOT EXISTS ai_insights (
    id {PK},
    post_id INTEGER NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
    insight_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT {NOW}
);
CREATE TABLE IF NOT EXISTS chat_conversations (
    id {PK},
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New conversation',
    created_at TEXT NOT NULL DEFAULT {NOW},
    updated_at TEXT NOT NULL DEFAULT {NOW}
);
CREATE TABLE IF NOT EXISTS chat_messages (
    id {PK},
    conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 6000),
    created_at TEXT NOT NULL DEFAULT {NOW}
);
CREATE TABLE IF NOT EXISTS diary_entries (
    id {PK},
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
    content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 10000),
    mood TEXT CHECK(mood IN ('calm','hopeful','neutral','anxious','sad','angry')),
    created_at TEXT NOT NULL DEFAULT {NOW},
    updated_at TEXT NOT NULL DEFAULT {NOW}
);
CREATE TABLE IF NOT EXISTS notifications (
    id {PK},
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0,1)),
    created_at TEXT NOT NULL DEFAULT {NOW}
);
CREATE TABLE IF NOT EXISTS counselor_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT NOT NULL DEFAULT '',
    expertise TEXT NOT NULL DEFAULT '',
    availability TEXT NOT NULL DEFAULT 'Unavailable',
    is_verified INTEGER NOT NULL DEFAULT 0 CHECK(is_verified IN (0,1))
);
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id {PK},
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    admin_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT {NOW}
);
CREATE TABLE IF NOT EXISTS password_resets (
    id {PK},
    email TEXT NOT NULL {NOCASE},
    otp_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT {NOW}
);
CREATE INDEX IF NOT EXISTS idx_posts_status_created ON posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_user_created ON comments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_post_user ON reactions(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_diary_entries_user ON diary_entries(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_post ON reports(post_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment ON comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email, expires_at);
"""

_PG_EXTRA = """
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));
CREATE INDEX IF NOT EXISTS idx_password_resets_email_lower ON password_resets (lower(email));
"""


def schema_sql():
    if is_postgres():
        return _SCHEMA_TEMPLATE.format(PK="SERIAL PRIMARY KEY", NOW=f"({PG_NOW})", NOCASE="") + _PG_EXTRA
    return _SCHEMA_TEMPLATE.format(PK="INTEGER PRIMARY KEY AUTOINCREMENT", NOW="CURRENT_TIMESTAMP", NOCASE="COLLATE NOCASE")


# Kept for backwards compatibility with scripts that import it.
SCHEMA = _SCHEMA_TEMPLATE.format(PK="INTEGER PRIMARY KEY AUTOINCREMENT", NOW="CURRENT_TIMESTAMP", NOCASE="COLLATE NOCASE")

# Columns added after the first release: (table, column, definition).
_MIGRATIONS = [
    ("users", "is_active", "INTEGER NOT NULL DEFAULT 1"),
    ("users", "token_version", "INTEGER NOT NULL DEFAULT 0"),
    ("users", "updated_at", "TEXT"),
    ("users", "is_flagged", "INTEGER NOT NULL DEFAULT 0"),
    ("users", "flag_reason", "TEXT"),
    ("users", "flagged_at", "TEXT"),
    ("users", "last_login_at", "TEXT"),
    ("user_preferences", "ai_support_enabled", "INTEGER NOT NULL DEFAULT 0"),
]


def _columns(connection, table):
    if is_postgres():
        rows = connection.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_name=?", (table,)
        ).fetchall()
        return {row["column_name"] for row in rows}
    return {row[1] for row in connection.execute(f"PRAGMA table_info({table})")}


def init_db():
    require_persistent_database()
    connection = get_connection()
    try:
        # Tables must exist before the column migrations, but the CREATE INDEX
        # statements may reference migrated columns, so run tables first.
        script = schema_sql()
        tables_part, _, indexes_part = script.partition("CREATE INDEX")
        connection.executescript(tables_part)
        # Non-destructive migration for databases created by older versions.
        for table, column, definition in _MIGRATIONS:
            if column not in _columns(connection, table):
                connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
                if (table, column) == ("users", "updated_at"):
                    connection.execute("UPDATE users SET updated_at=CURRENT_TIMESTAMP WHERE updated_at IS NULL")
        connection.executescript("CREATE INDEX" + indexes_part)
        connection.commit()
    finally:
        connection.close()


# Tables wiped by an admin "clear data" request, children first.
CONTENT_TABLES = [
    "password_resets", "comment_reports", "reports", "reactions", "ai_insights", "comments", "posts",
    "chat_messages", "chat_conversations", "diary_entries", "notifications",
]
