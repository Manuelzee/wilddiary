import datetime as dt
import hashlib
import hmac
import os
import re
import sqlite3
from functools import wraps

import jwt
from dotenv import load_dotenv
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

from db import fetch_all, fetch_one, init_db, transaction
from ai_service import generate_reply, generate_post_insight


load_dotenv()
ALLOWED_CATEGORIES = {"emotional", "financial", "relationship", "social", "other"}
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_]{3,30}$")
TOXIC_PHRASES = {"kill yourself", "kys", "retard", "worthless", "suicide"}


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.update(
        JWT_SECRET=os.getenv("JWT_SECRET", ""),
        JWT_TTL_HOURS=int(os.getenv("JWT_TTL_HOURS", "24")),
        MAX_CONTENT_LENGTH=1 * 1024 * 1024,
        JSON_SORT_KEYS=False,
    )
    if test_config:
        app.config.update(test_config)
    if not app.config["JWT_SECRET"]:
        app.logger.warning("JWT_SECRET is not set; generating a secure runtime secret for this instance.")
        app.config["JWT_SECRET"] = os.getenv("JWT_SECRET") or hashlib.sha256(f"wilddiary-{os.urandom(24)}".encode()).hexdigest()

    cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
    if cors_origins_env.strip() == "*":
        origins = "*"
    else:
        origins = [value.strip() for value in cors_origins_env.split(",") if value.strip()]
    CORS(
        app,
        resources={r"/api/*": {"origins": origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "Accept"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    )
    init_db()
    register_routes(app)
    register_errors(app)
    return app


def api_error(message, status=400, code="bad_request"):
    return jsonify({"message": message, "code": code}), status


def clean_text(value, maximum):
    if not isinstance(value, str):
        return ""
    return value.strip()[: maximum + 1]


def is_safe(text):
    normalized = " ".join(text.lower().split())
    return not any(phrase in normalized for phrase in TOXIC_PHRASES)


def public_user(user):
    return {key: user[key] for key in ("id", "username", "email", "role")}


def issue_token(user):
    now = dt.datetime.now(dt.timezone.utc)
    payload = {
        "sub": str(user["id"]), "ver": user.get("token_version", 0),
        "iat": now, "exp": now + dt.timedelta(hours=int(g.get("jwt_ttl", 24))),
    }
    return jwt.encode(payload, g.jwt_secret, algorithm="HS256")


def optional_user():
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    try:
        payload = jwt.decode(header[7:], g.jwt_secret, algorithms=["HS256"])
        user = fetch_one("SELECT * FROM users WHERE id = ? AND is_active = 1", (int(payload["sub"]),))
        if not user or payload.get("ver", 0) != user.get("token_version", 0):
            return None
        return user
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        return None


def auth_required(handler):
    @wraps(handler)
    def wrapped(*args, **kwargs):
        user = optional_user()
        if not user:
            return api_error("Authentication required or session expired.", 401, "unauthorized")
        return handler(user, *args, **kwargs)
    return wrapped


def verify_password(stored, password):
    if stored.startswith(("scrypt:", "pbkdf2:")):
        return check_password_hash(stored, password), False
    legacy = hashlib.sha256(password.encode()).hexdigest()
    return hmac.compare_digest(stored, legacy), True


def serialize_post(row, viewer_id=None):
    row["is_anonymous"] = bool(row["is_anonymous"])
    row["liked_by_me"] = bool(row.pop("liked_by_me", 0))
    row["has_ai_insight"] = bool(row.get("has_ai_insight", 0))
    if row["is_anonymous"] and row.get("user_id") != viewer_id:
        row.update(user_id=None, author_name="Anonymous Writer", author_role="user")
    return row


POST_SELECT = """
SELECT p.*, u.username AS author_name, u.role AS author_role,
 (SELECT COUNT(*) FROM reactions r WHERE r.post_id=p.id) AS reactions_count,
 (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.status='active') AS comments_count,
 EXISTS(SELECT 1 FROM ai_insights ai WHERE ai.post_id=p.id) AS has_ai_insight,
 EXISTS(SELECT 1 FROM reactions mine WHERE mine.post_id=p.id AND mine.user_id=?) AS liked_by_me
FROM posts p LEFT JOIN users u ON u.id=p.user_id
"""


def insight_for(category):
    messages = {
        "emotional": "It sounds like you are carrying a lot emotionally. Your feelings are valid; consider reaching out to someone you trust or a qualified counselor and take one gentle step at a time.",
        "financial": "Financial stress can affect every part of life, but it does not define your worth. Break the problem into small actions and consider a reputable, free financial counseling service.",
        "relationship": "Relationship strain is exhausting. Clear boundaries, calm communication, and prioritizing your physical and emotional safety can help you decide the next step.",
        "social": "Feeling disconnected can be deeply painful. Small, low-pressure interactions and communities built around shared interests can be a manageable place to reconnect.",
        "other": "Thank you for sharing what you are carrying. Pause, breathe, and consider one trusted person or qualified professional who can support your next step.",
    }
    return "AI-generated supportive reflection — not medical advice: " + messages.get(category, messages["other"])


def register_routes(app):
    @app.before_request
    def load_security_config():
        g.jwt_secret = app.config["JWT_SECRET"]
        g.jwt_ttl = app.config["JWT_TTL_HOURS"]

    @app.get("/api/status")
    def status():
        return jsonify(status="healthy", timestamp=dt.datetime.now(dt.timezone.utc).isoformat())

    @app.get("/api/health")
    def health():
        t0 = dt.datetime.now(dt.timezone.utc)
        db_status = "ok"
        try:
            with transaction() as connection:
                connection.execute("SELECT 1").fetchone()
        except Exception as exc:
            db_status = f"unhealthy: {str(exc)}"
        latency_ms = round((dt.datetime.now(dt.timezone.utc) - t0).total_seconds() * 1000, 2)
        return jsonify(
            status="healthy" if db_status == "ok" else "degraded",
            database=db_status,
            latency_ms=latency_ms,
            timestamp=t0.isoformat()
        ), (200 if db_status == "ok" else 503)

    @app.post("/api/auth/register")
    def register():
        data = request.get_json(silent=True) or {}
        username = clean_text(data.get("username"), 30)
        email = clean_text(data.get("email"), 254).lower()
        password = data.get("password", "")
        if not USERNAME_PATTERN.fullmatch(username):
            return api_error("Username must be 3–30 characters using letters, numbers, or underscores.")
        if not EMAIL_PATTERN.fullmatch(email):
            return api_error("Enter a valid email address.")
        if not isinstance(password, str) or len(password) < 8 or len(password) > 128:
            return api_error("Password must be between 8 and 128 characters.")
        # Counselor status is privileged and can never be self-assigned.
        try:
            with transaction() as connection:
                cursor = connection.execute(
                    "INSERT INTO users(username,email,password_hash,role) VALUES(?,?,?,'user')",
                    (username, email, generate_password_hash(password, method="scrypt")),
                )
                user = dict(connection.execute("SELECT * FROM users WHERE id=?", (cursor.lastrowid,)).fetchone())
        except sqlite3.IntegrityError:
            return api_error("Username or email is already registered.", 409, "conflict")
        token = issue_token(user)
        return jsonify(token=token, user=public_user(user)), 201

    @app.post("/api/auth/login")
    def login():
        data = request.get_json(silent=True) or {}
        email = clean_text(data.get("email"), 254).lower()
        password = data.get("password", "")
        user = fetch_one("SELECT * FROM users WHERE email=? AND is_active=1", (email,))
        if not user:
            return api_error("Invalid email or password.", 401, "invalid_credentials")
        valid, legacy = verify_password(user["password_hash"], password)
        if not valid:
            return api_error("Invalid email or password.", 401, "invalid_credentials")
        if legacy:
            with transaction() as connection:
                connection.execute("UPDATE users SET password_hash=? WHERE id=?", (generate_password_hash(password, method="scrypt"), user["id"]))
        return jsonify(token=issue_token(user), user=public_user(user))

    @app.get("/api/auth/me")
    @auth_required
    def me(user):
        return jsonify(user=public_user(user))

    @app.patch("/api/users/me")
    @auth_required
    def update_me(user):
        data = request.get_json(silent=True) or {}
        username = clean_text(data.get("username", user["username"]), 30)
        email = clean_text(data.get("email", user["email"]), 254).lower()
        if not USERNAME_PATTERN.fullmatch(username) or not EMAIL_PATTERN.fullmatch(email):
            return api_error("Enter a valid username and email address.")
        try:
            with transaction() as connection:
                connection.execute("UPDATE users SET username=?,email=?,updated_at=CURRENT_TIMESTAMP WHERE id=?", (username, email, user["id"]))
                updated = dict(connection.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone())
        except sqlite3.IntegrityError:
            return api_error("Username or email is already in use.", 409, "conflict")
        return jsonify(user=public_user(updated))

    @app.post("/api/users/me/password")
    @auth_required
    def change_password(user):
        data = request.get_json(silent=True) or {}
        current, new = data.get("current_password", ""), data.get("new_password", "")
        valid, _ = verify_password(user["password_hash"], current)
        if not valid:
            return api_error("Current password is incorrect.", 403, "invalid_password")
        if not isinstance(new, str) or len(new) < 8 or len(new) > 128:
            return api_error("New password must be between 8 and 128 characters.")
        with transaction() as connection:
            connection.execute("UPDATE users SET password_hash=?,token_version=token_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?", (generate_password_hash(new, method="scrypt"), user["id"]))
        return jsonify(message="Password updated. Please sign in again.")

    @app.delete("/api/users/me")
    @auth_required
    def deactivate(user):
        with transaction() as connection:
            connection.execute("UPDATE users SET is_active=0,token_version=token_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?", (user["id"],))
            connection.execute("UPDATE posts SET is_anonymous=1 WHERE user_id=?", (user["id"],))
            connection.execute("UPDATE comments SET is_anonymous=1 WHERE user_id=?", (user["id"],))
        return "", 204

    @app.get("/api/users/me/posts")
    @auth_required
    def my_posts(user):
        rows = fetch_all(f"{POST_SELECT} WHERE p.user_id=? ORDER BY p.created_at DESC", (user["id"], user["id"]))
        return jsonify([serialize_post(row, user["id"]) for row in rows])

    @app.get("/api/users/me/export")
    @auth_required
    def export_data(user):
        diary = fetch_all("SELECT id, title, content, mood, created_at, updated_at FROM diary_entries WHERE user_id=? ORDER BY created_at ASC", (user["id"],))
        posts_data = fetch_all("SELECT id, content, category, is_anonymous, status, created_at FROM posts WHERE user_id=? ORDER BY created_at ASC", (user["id"],))
        comments_data = fetch_all("SELECT id, post_id, content, is_anonymous, status, created_at FROM comments WHERE user_id=? ORDER BY created_at ASC", (user["id"],))
        prefs = fetch_one("SELECT * FROM user_preferences WHERE user_id=?", (user["id"],))
        archive = {
            "exported_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "user": public_user(user),
            "preferences": prefs or {},
            "diary_entries": diary,
            "posts": posts_data,
            "comments": comments_data,
        }
        resp = jsonify(archive)
        resp.headers["Content-Disposition"] = f"attachment; filename=wilddiary-export-{user['username']}.json"
        return resp

    @app.get("/api/users/me/preferences")
    @auth_required
    def get_preferences(user):
        prefs = fetch_one("SELECT * FROM user_preferences WHERE user_id=?", (user["id"],))
        if not prefs:
            with transaction() as connection:
                connection.execute("INSERT OR IGNORE INTO user_preferences(user_id) VALUES(?)", (user["id"],))
            prefs = fetch_one("SELECT * FROM user_preferences WHERE user_id=?", (user["id"],))
        return jsonify(preferences=prefs or {"user_id": user["id"], "default_anonymous": 1, "email_notifications": 1, "reaction_notifications": 1, "counselor_notifications": 1})

    @app.patch("/api/users/me/preferences")
    @auth_required
    def update_preferences(user):
        data = request.get_json(silent=True) or {}
        default_anon = 1 if data.get("default_anonymous", True) else 0
        email_notif = 1 if data.get("email_notifications", True) else 0
        react_notif = 1 if data.get("reaction_notifications", True) else 0
        counselor_notif = 1 if data.get("counselor_notifications", True) else 0
        with transaction() as connection:
            connection.execute("""
                INSERT INTO user_preferences(user_id, default_anonymous, email_notifications, reaction_notifications, counselor_notifications, updated_at)
                VALUES(?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    default_anonymous=excluded.default_anonymous,
                    email_notifications=excluded.email_notifications,
                    reaction_notifications=excluded.reaction_notifications,
                    counselor_notifications=excluded.counselor_notifications,
                    updated_at=CURRENT_TIMESTAMP
            """, (user["id"], default_anon, email_notif, react_notif, counselor_notif))
            updated = connection.execute("SELECT * FROM user_preferences WHERE user_id=?", (user["id"],)).fetchone()
        return jsonify(preferences=dict(updated))

    @app.get("/api/posts")
    def posts():
        viewer = optional_user()
        category = request.args.get("category", "all").lower()
        sort = request.args.get("sort", "latest").lower()
        q = clean_text(request.args.get("q", ""), 100).strip()
        try:
            limit = min(max(int(request.args.get("limit", 50)), 1), 100)
            offset = max(int(request.args.get("offset", 0)), 0)
        except (TypeError, ValueError):
            limit, offset = 50, 0

        if category != "all" and category not in ALLOWED_CATEGORIES:
            return api_error("Invalid category.")
        where = "WHERE p.status='active'"
        params = [viewer["id"] if viewer else -1]
        if category != "all":
            where += " AND p.category=?"
            params.append(category)
        if q:
            where += " AND (p.content LIKE ? OR p.category LIKE ?)"
            params.extend([f"%{q}%", f"%{q}%"])

        order = "ORDER BY reactions_count DESC,p.created_at DESC" if sort == "popular" else "ORDER BY p.created_at DESC"
        query = f"{POST_SELECT} {where} {order} LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        return jsonify([serialize_post(row, viewer["id"] if viewer else None) for row in fetch_all(query, tuple(params))])

    @app.get("/api/posts/<int:post_id>")
    def post_detail(post_id):
        viewer = optional_user()
        row = fetch_one(POST_SELECT + " LEFT JOIN ai_insights ai ON ai.post_id=p.id WHERE p.id=? AND p.status='active'", ((viewer or {}).get("id", -1), post_id))
        if not row:
            return api_error("Post not found.", 404, "not_found")
        insight = fetch_one("SELECT insight_text FROM ai_insights WHERE post_id=?", (post_id,))
        row["ai_insight"] = insight["insight_text"] if insight else None
        return jsonify(serialize_post(row, (viewer or {}).get("id")))

    @app.delete("/api/posts/<int:post_id>")
    @auth_required
    def delete_post(user, post_id):
        with transaction() as connection:
            post = connection.execute("SELECT user_id FROM posts WHERE id=?", (post_id,)).fetchone()
            if not post:
                return api_error("Post not found.", 404, "not_found")
            if post["user_id"] != user["id"] and user.get("role") != "admin":
                return api_error("You do not have permission to delete this post.", 403, "forbidden")
            connection.execute("DELETE FROM posts WHERE id=?", (post_id,))
        return "", 204

    @app.post("/api/posts")
    @app.post("/api/posts/create")
    @auth_required
    def create_post(user):
        data = request.get_json(silent=True) or {}
        content = clean_text(data.get("content"), 5000)
        category = clean_text(data.get("category", "other"), 30).lower()
        if not content or len(content) > 5000:
            return api_error("Post content must be between 1 and 5,000 characters.")
        if category not in ALLOWED_CATEGORIES:
            return api_error("Invalid category.")
        status_value = "active" if is_safe(content) else "under_review"
        with transaction() as connection:
            cursor = connection.execute("INSERT INTO posts(user_id,content,category,is_anonymous,status) VALUES(?,?,?,?,?)", (user["id"], content, category, int(bool(data.get("is_anonymous", True))), status_value))
        return jsonify(message="Post created.", post_id=cursor.lastrowid, status=status_value, moderated=status_value != "active"), 201

    @app.post("/api/posts/<int:post_id>/react")
    @auth_required
    def react(user, post_id):
        with transaction() as connection:
            if not connection.execute("SELECT 1 FROM posts WHERE id=? AND status='active'", (post_id,)).fetchone():
                return api_error("Post not found.", 404, "not_found")
            deleted = connection.execute("DELETE FROM reactions WHERE post_id=? AND user_id=?", (post_id, user["id"])).rowcount
            if not deleted:
                connection.execute("INSERT INTO reactions(post_id,user_id) VALUES(?,?)", (post_id, user["id"]))
                owner = connection.execute("SELECT user_id FROM posts WHERE id=?", (post_id,)).fetchone()[0]
                if owner and owner != user["id"]:
                    connection.execute("INSERT INTO notifications(user_id,type,message,link) VALUES(?,'reaction',?,?)", (owner, f"{user['username']} supported your diary entry.", f"/post/{post_id}"))
            count = connection.execute("SELECT COUNT(*) FROM reactions WHERE post_id=?", (post_id,)).fetchone()[0]
        return jsonify(liked=not bool(deleted), reactions_count=count)

    @app.post("/api/posts/<int:post_id>/report")
    @auth_required
    def report(user, post_id):
        reason = clean_text((request.get_json(silent=True) or {}).get("reason", "Community guidelines violation"), 500)
        if len(reason) < 3:
            return api_error("Please provide a report reason.")
        try:
            with transaction() as connection:
                post = connection.execute("SELECT user_id FROM posts WHERE id=? AND status!='flagged'", (post_id,)).fetchone()
                if not post: return api_error("Post not found.", 404, "not_found")
                if post["user_id"] == user["id"]: return api_error("You cannot report your own post.", 403, "forbidden")
                if connection.execute("SELECT 1 FROM reports WHERE reporter_id=? AND post_id=?", (user["id"], post_id)).fetchone():
                    return api_error("You have already reported this post.", 409, "already_reported")
                connection.execute("INSERT INTO reports(reporter_id,post_id,reason) VALUES(?,?,?)", (user["id"], post_id, reason))
                count = connection.execute("SELECT COUNT(*) FROM reports WHERE post_id=?", (post_id,)).fetchone()[0]
                new_status = "flagged" if count >= 5 else ("under_review" if count >= 3 else "active")
                connection.execute("UPDATE posts SET status=? WHERE id=?", (new_status, post_id))
        except sqlite3.IntegrityError:
            return api_error("You have already reported this post.", 409, "already_reported")
        return jsonify(message="Report received.", status=new_status)

    @app.get("/api/posts/<int:post_id>/comments")
    def comments(post_id):
        if not fetch_one("SELECT 1 AS ok FROM posts WHERE id=? AND status='active'", (post_id,)):
            return api_error("Post not found.", 404, "not_found")
        rows = fetch_all("SELECT c.*,u.username author_name,u.role author_role FROM comments c LEFT JOIN users u ON u.id=c.user_id WHERE c.post_id=? AND c.status='active' ORDER BY c.created_at", (post_id,))
        for row in rows:
            row["is_anonymous"] = bool(row["is_anonymous"])
            if row["is_anonymous"]:
                row.update(user_id=None, author_name="Anonymous Writer", author_role="user")
        return jsonify(rows)

    @app.post("/api/posts/<int:post_id>/comments")
    @app.post("/api/posts/<int:post_id>/comments/create")
    @auth_required
    def create_comment(user, post_id):
        data = request.get_json(silent=True) or {}
        content = clean_text(data.get("content"), 2000)
        if not content or len(content) > 2000:
            return api_error("Comment must be between 1 and 2,000 characters.")
        status_value = "active" if is_safe(content) else "under_review"
        with transaction() as connection:
            if not connection.execute("SELECT 1 FROM posts WHERE id=? AND status='active'", (post_id,)).fetchone():
                return api_error("Post not found.", 404, "not_found")
            cursor = connection.execute("INSERT INTO comments(post_id,user_id,content,is_anonymous,status) VALUES(?,?,?,?,?)", (post_id, user["id"], content, int(bool(data.get("is_anonymous", False))), status_value))
            owner = connection.execute("SELECT user_id FROM posts WHERE id=?", (post_id,)).fetchone()[0]
            if status_value == "active" and owner and owner != user["id"]:
                author = "Someone" if data.get("is_anonymous", False) else user["username"]
                connection.execute("INSERT INTO notifications(user_id,type,message,link) VALUES(?,'response',?,?)", (owner, f"{author} responded to your diary entry.", f"/post/{post_id}"))
        return jsonify(message="Comment added.", comment_id=cursor.lastrowid, status=status_value, moderated=status_value != "active"), 201

    @app.delete("/api/posts/<int:post_id>/comments/<int:comment_id>")
    @auth_required
    def delete_comment(user, post_id, comment_id):
        with transaction() as connection:
            comment = connection.execute("SELECT c.user_id, p.user_id AS post_owner_id FROM comments c JOIN posts p ON p.id=c.post_id WHERE c.id=? AND c.post_id=?", (comment_id, post_id)).fetchone()
            if not comment:
                return api_error("Comment not found.", 404, "not_found")
            if comment["user_id"] != user["id"] and comment["post_owner_id"] != user["id"] and user.get("role") != "admin":
                return api_error("You do not have permission to delete this comment.", 403, "forbidden")
            connection.execute("DELETE FROM comments WHERE id=?", (comment_id,))
        return "", 204

    @app.post("/api/posts/<int:post_id>/comments/<int:comment_id>/report")
    @auth_required
    def report_comment(user, post_id, comment_id):
        reason = clean_text((request.get_json(silent=True) or {}).get("reason", "Community guidelines violation"), 500)
        if len(reason) < 3:
            return api_error("Please provide a report reason.")
        try:
            with transaction() as connection:
                comment = connection.execute("SELECT user_id FROM comments WHERE id=? AND post_id=? AND status!='flagged'", (comment_id, post_id)).fetchone()
                if not comment:
                    return api_error("Comment not found.", 404, "not_found")
                if comment["user_id"] == user["id"]:
                    return api_error("You cannot report your own comment.", 403, "forbidden")
                if connection.execute("SELECT 1 FROM comment_reports WHERE reporter_id=? AND comment_id=?", (user["id"], comment_id)).fetchone():
                    return api_error("You have already reported this comment.", 409, "already_reported")
                connection.execute("INSERT INTO comment_reports(reporter_id,comment_id,reason) VALUES(?,?,?)", (user["id"], comment_id, reason))
                count = connection.execute("SELECT COUNT(*) FROM comment_reports WHERE comment_id=?", (comment_id,)).fetchone()[0]
                new_status = "flagged" if count >= 5 else ("under_review" if count >= 3 else "active")
                connection.execute("UPDATE comments SET status=? WHERE id=?", (new_status, comment_id))
        except sqlite3.IntegrityError:
            return api_error("You have already reported this comment.", 409, "already_reported")
        return jsonify(message="Comment report received.", status=new_status)

    @app.post("/api/posts/<int:post_id>/ai-insight")
    @auth_required
    def ai_insight(_user, post_id):
        post = fetch_one("SELECT content, category FROM posts WHERE id=? AND status='active'", (post_id,))
        if not post: return api_error("Post not found.", 404, "not_found")
        text = generate_post_insight(post["content"], post["category"])
        with transaction() as connection:
            connection.execute("INSERT OR REPLACE INTO ai_insights(post_id,insight_text) VALUES(?,?)", (post_id, text))
            result = connection.execute("SELECT insight_text FROM ai_insights WHERE post_id=?", (post_id,)).fetchone()[0]
        return jsonify(insight=result)

    @app.get("/api/chat/conversations")
    @auth_required
    def list_conversations(user):
        rows = fetch_all("""SELECT c.id,c.title,c.created_at,c.updated_at,
            (SELECT content FROM chat_messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1) last_message
            FROM chat_conversations c WHERE c.user_id=? ORDER BY c.updated_at DESC LIMIT 50""", (user["id"],))
        return jsonify(rows)

    @app.post("/api/chat/conversations")
    @auth_required
    def create_conversation(user):
        with transaction() as connection:
            cursor = connection.execute("INSERT INTO chat_conversations(user_id) VALUES(?)", (user["id"],))
        return jsonify(id=cursor.lastrowid, title="New conversation"), 201

    @app.get("/api/chat/conversations/<int:conversation_id>/messages")
    @auth_required
    def conversation_messages(user, conversation_id):
        if not fetch_one("SELECT 1 ok FROM chat_conversations WHERE id=? AND user_id=?", (conversation_id, user["id"])):
            return api_error("Conversation not found.", 404, "not_found")
        return jsonify(fetch_all("SELECT id,role,content,created_at FROM chat_messages WHERE conversation_id=? ORDER BY id", (conversation_id,)))

    @app.post("/api/chat/conversations/<int:conversation_id>/messages")
    @auth_required
    def send_chat_message(user, conversation_id):
        content = clean_text((request.get_json(silent=True) or {}).get("content"), 4000)
        if not content or len(content) > 4000:
            return api_error("Message must be between 1 and 4,000 characters.")
        conversation = fetch_one("SELECT id,title FROM chat_conversations WHERE id=? AND user_id=?", (conversation_id, user["id"]))
        if not conversation:
            return api_error("Conversation not found.", 404, "not_found")
        recent_count = fetch_one("SELECT COUNT(*) count FROM chat_messages m JOIN chat_conversations c ON c.id=m.conversation_id WHERE c.user_id=? AND m.role='user' AND m.created_at >= datetime('now','-1 hour')", (user["id"],))["count"]
        if recent_count >= 30:
            return api_error("Chat limit reached. Please try again later.", 429, "rate_limited")
        history = fetch_all("SELECT role,content FROM chat_messages WHERE conversation_id=? ORDER BY id DESC LIMIT 19", (conversation_id,))
        history.reverse()
        history.append({"role": "user", "content": content})
        try:
            reply, mode = generate_reply(history)
        except Exception:
            app.logger.exception("AI chat provider failed")
            reply, mode = generate_reply([{"role": "user", "content": content}]) if not os.getenv("OPENAI_API_KEY") else ("I’m having trouble responding right now. Please try again shortly.", "unavailable")
        title = content[:57] + ("…" if len(content) > 57 else "")
        with transaction() as connection:
            user_cursor = connection.execute("INSERT INTO chat_messages(conversation_id,role,content) VALUES(?,'user',?)", (conversation_id, content))
            assistant_cursor = connection.execute("INSERT INTO chat_messages(conversation_id,role,content) VALUES(?,'assistant',?)", (conversation_id, reply))
            connection.execute("UPDATE chat_conversations SET title=CASE WHEN title='New conversation' THEN ? ELSE title END,updated_at=CURRENT_TIMESTAMP WHERE id=?", (title, conversation_id))
        return jsonify(
            user_message={"id": user_cursor.lastrowid, "role": "user", "content": content},
            assistant_message={"id": assistant_cursor.lastrowid, "role": "assistant", "content": reply},
            mode=mode,
        ), 201

    @app.delete("/api/chat/conversations/<int:conversation_id>")
    @auth_required
    def delete_conversation(user, conversation_id):
        with transaction() as connection:
            deleted = connection.execute("DELETE FROM chat_conversations WHERE id=? AND user_id=?", (conversation_id, user["id"])).rowcount
        if not deleted:
            return api_error("Conversation not found.", 404, "not_found")
        return "", 204

    @app.get("/api/diary")
    @auth_required
    def diary_entries(user):
        return jsonify(fetch_all("SELECT id,title,content,mood,created_at,updated_at FROM diary_entries WHERE user_id=? ORDER BY updated_at DESC", (user["id"],)))

    @app.post("/api/diary")
    @auth_required
    def create_diary_entry(user):
        data = request.get_json(silent=True) or {}
        title, content = clean_text(data.get("title"), 120), clean_text(data.get("content"), 10000)
        mood = clean_text(data.get("mood"), 20) or None
        if not title or len(title) > 120 or not content or len(content) > 10000:
            return api_error("A title and diary text are required.")
        if mood not in {None, "calm", "hopeful", "neutral", "anxious", "sad", "angry"}:
            return api_error("Invalid mood.")
        with transaction() as connection:
            cursor = connection.execute("INSERT INTO diary_entries(user_id,title,content,mood) VALUES(?,?,?,?)", (user["id"], title, content, mood))
        return jsonify(id=cursor.lastrowid, title=title, content=content, mood=mood), 201

    @app.get("/api/diary/<int:entry_id>")
    @auth_required
    def diary_entry(user, entry_id):
        entry = fetch_one("SELECT id,title,content,mood,created_at,updated_at FROM diary_entries WHERE id=? AND user_id=?", (entry_id, user["id"]))
        return jsonify(entry) if entry else api_error("Diary entry not found.", 404, "not_found")

    @app.patch("/api/diary/<int:entry_id>")
    @auth_required
    def update_diary_entry(user, entry_id):
        current = fetch_one("SELECT * FROM diary_entries WHERE id=? AND user_id=?", (entry_id, user["id"]))
        if not current: return api_error("Diary entry not found.", 404, "not_found")
        data = request.get_json(silent=True) or {}
        title = clean_text(data.get("title", current["title"]), 120)
        content = clean_text(data.get("content", current["content"]), 10000)
        mood = clean_text(data.get("mood", current["mood"]), 20) or None
        if not title or not content or mood not in {None, "calm", "hopeful", "neutral", "anxious", "sad", "angry"}: return api_error("Invalid diary entry.")
        with transaction() as connection:
            connection.execute("UPDATE diary_entries SET title=?,content=?,mood=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?", (title, content, mood, entry_id, user["id"]))
        return jsonify(id=entry_id, title=title, content=content, mood=mood)

    @app.delete("/api/diary/<int:entry_id>")
    @auth_required
    def delete_diary_entry(user, entry_id):
        with transaction() as connection:
            deleted = connection.execute("DELETE FROM diary_entries WHERE id=? AND user_id=?", (entry_id, user["id"])).rowcount
        return ("", 204) if deleted else api_error("Diary entry not found.", 404, "not_found")

    @app.get("/api/insights")
    @auth_required
    def personal_insights(user):
        moods = fetch_all("SELECT COALESCE(mood,'not recorded') label,COUNT(*) count FROM diary_entries WHERE user_id=? GROUP BY mood ORDER BY count DESC", (user["id"],))
        categories = fetch_all("SELECT category label,COUNT(*) count FROM posts WHERE user_id=? GROUP BY category ORDER BY count DESC", (user["id"],))
        totals = fetch_one("SELECT COUNT(*) entries,MIN(created_at) first_entry,MAX(updated_at) latest_entry FROM diary_entries WHERE user_id=?", (user["id"],))
        return jsonify(moods=moods, categories=categories, totals=totals, disclaimer="Patterns are descriptive reflections, not medical assessments.")

    @app.get("/api/counselors")
    def counselors():
        return jsonify(fetch_all("""SELECT u.id,u.username,p.bio,p.expertise,p.availability,p.is_verified
            FROM counselor_profiles p JOIN users u ON u.id=p.user_id
            WHERE u.role='counselor' AND u.is_active=1 AND p.is_verified=1 ORDER BY u.username"""))

    @app.get("/api/notifications")
    @auth_required
    def notifications(user):
        return jsonify(fetch_all("SELECT id,type,message,link,is_read,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100", (user["id"],)))

    @app.post("/api/notifications/read")
    @auth_required
    def read_notifications(user):
        with transaction() as connection:
            connection.execute("UPDATE notifications SET is_read=1 WHERE user_id=?", (user["id"],))
        return jsonify(message="Notifications marked as read.")

    @app.get("/api/admin/reports")
    @auth_required
    def admin_reports(user):
        if user.get("role") != "admin":
            return api_error("Administrator access required.", 403, "forbidden")
        post_reps = fetch_all("""
            SELECT r.id, 'post' AS target_type, r.post_id AS target_id, r.reporter_id, u.username AS reporter_name,
                   r.reason, r.created_at, p.content AS target_content, p.status AS target_status
            FROM reports r
            JOIN users u ON u.id = r.reporter_id
            JOIN posts p ON p.id = r.post_id
            ORDER BY r.created_at DESC LIMIT 100
        """)
        comment_reps = fetch_all("""
            SELECT cr.id, 'comment' AS target_type, cr.comment_id AS target_id, cr.reporter_id, u.username AS reporter_name,
                   cr.reason, cr.created_at, c.content AS target_content, c.status AS target_status
            FROM comment_reports cr
            JOIN users u ON u.id = cr.reporter_id
            JOIN comments c ON c.id = cr.comment_id
            ORDER BY cr.created_at DESC LIMIT 100
        """)
        return jsonify(reports=post_reps + comment_reps)

    @app.patch("/api/admin/posts/<int:post_id>/status")
    @auth_required
    def admin_update_post_status(user, post_id):
        if user.get("role") != "admin":
            return api_error("Administrator access required.", 403, "forbidden")
        status_val = clean_text((request.get_json(silent=True) or {}).get("status"), 20).lower()
        if status_val not in {"active", "under_review", "flagged"}:
            return api_error("Invalid status value.")
        with transaction() as connection:
            if not connection.execute("SELECT 1 FROM posts WHERE id=?", (post_id,)).fetchone():
                return api_error("Post not found.", 404, "not_found")
            connection.execute("UPDATE posts SET status=? WHERE id=?", (status_val, post_id))
        return jsonify(message="Post status updated.", status=status_val)

    @app.post("/api/admin/counselors/<int:target_user_id>/verify")
    @auth_required
    def admin_verify_counselor(user, target_user_id):
        if user.get("role") != "admin":
            return api_error("Administrator access required.", 403, "forbidden")
        with transaction() as connection:
            target = connection.execute("SELECT id, role FROM users WHERE id=?", (target_user_id,)).fetchone()
            if not target:
                return api_error("User not found.", 404, "not_found")
            connection.execute("UPDATE users SET role='counselor' WHERE id=?", (target_user_id,))
            connection.execute("""
                INSERT INTO counselor_profiles(user_id, is_verified) VALUES(?, 1)
                ON CONFLICT(user_id) DO UPDATE SET is_verified=1
            """, (target_user_id,))
        return jsonify(message="Counselor verified successfully.", user_id=target_user_id)


def register_errors(app):
    @app.errorhandler(404)
    def not_found(_error): return api_error("Endpoint not found.", 404, "not_found")

    @app.errorhandler(405)
    def method_not_allowed(_error): return api_error("Method not allowed.", 405, "method_not_allowed")

    @app.errorhandler(413)
    def too_large(_error): return api_error("Request body is too large.", 413, "payload_too_large")

    @app.errorhandler(Exception)
    def unexpected(error):
        app.logger.exception("Unhandled API error", exc_info=error)
        return api_error("An unexpected server error occurred.", 500, "server_error")


app = create_app()


if __name__ == "__main__":
    app.run(host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG") == "1")
