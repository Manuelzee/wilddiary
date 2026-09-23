import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


TEST_DIR = tempfile.TemporaryDirectory()
os.environ["DATABASE_PATH"] = str(Path(TEST_DIR.name) / "test.db")
os.environ["JWT_SECRET"] = "test-secret-that-is-not-used-outside-tests"

from app import create_app  # noqa: E402


class ApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app({"TESTING": True, "JWT_SECRET": "test-secret"})

    def setUp(self):
        self.client = self.app.test_client()

    def register(self, username, email, password="correct-horse-battery"):
        return self.client.post("/api/auth/register", json={
            "username": username, "email": email, "password": password, "role": "counselor",
        })

    @staticmethod
    def auth(response):
        return {"Authorization": f"Bearer {response.get_json()['token']}"}

    def test_auth_validation_and_counselor_cannot_be_self_assigned(self):
        response = self.register("member_one", "member1@example.com")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["user"]["role"], "user")
        duplicate = self.register("member_two", "member1@example.com")
        self.assertEqual(duplicate.status_code, 409)
        weak = self.register("member_three", "member3@example.com", "short")
        self.assertEqual(weak.status_code, 400)

    def test_login_success_invalid_credentials_and_session_validation(self):
        registered = self.register("login_member", "login@example.com")
        self.assertEqual(registered.status_code, 201)

        valid = self.client.post("/api/auth/login", json={
            "email": " LOGIN@example.com ", "password": "correct-horse-battery",
        })
        self.assertEqual(valid.status_code, 200)
        self.assertEqual(valid.get_json()["user"]["email"], "login@example.com")
        me = self.client.get("/api/auth/me", headers=self.auth(valid))
        self.assertEqual(me.status_code, 200)

        invalid_password = self.client.post("/api/auth/login", json={
            "email": "login@example.com", "password": "wrong-password",
        })
        self.assertEqual(invalid_password.status_code, 401)
        self.assertEqual(invalid_password.get_json()["code"], "invalid_credentials")

        invalid_user = self.client.post("/api/auth/login", json={
            "email": "missing@example.com", "password": "wrong-password",
        })
        self.assertEqual(invalid_user.status_code, 401)
        self.assertEqual(invalid_user.get_json()["code"], "invalid_credentials")

    def test_token_is_valid_across_app_instances_with_shared_secret(self):
        second_app = create_app({"TESTING": True, "JWT_SECRET": "test-secret"})
        registered = self.register("worker_member", "worker@example.com")
        response = second_app.test_client().get("/api/auth/me", headers=self.auth(registered))
        self.assertEqual(response.status_code, 200)

    def test_production_requires_jwt_secret(self):
        with patch.dict(os.environ, {"APP_ENV": "production"}, clear=False):
            with patch.dict(os.environ, {"JWT_SECRET": ""}, clear=False):
                with self.assertRaisesRegex(RuntimeError, "JWT_SECRET must be set"):
                    create_app()
            with patch.dict(os.environ, {"JWT_SECRET": "too-short"}, clear=False):
                with self.assertRaisesRegex(RuntimeError, "at least 32 characters"):
                    create_app()

    def test_full_post_comment_reaction_flow_and_anonymity(self):
        owner = self.register("post_owner", "owner@example.com")
        viewer = self.register("post_viewer", "viewer@example.com")
        created = self.client.post("/api/posts", headers=self.auth(owner), json={
            "content": "I could use a little encouragement today.", "category": "emotional", "is_anonymous": True,
        })
        self.assertEqual(created.status_code, 201)
        post_id = created.get_json()["post_id"]

        public_post = self.client.get(f"/api/posts/{post_id}").get_json()
        self.assertEqual(public_post["author_name"], "Anonymous Writer")
        self.assertIsNone(public_post["user_id"])

        reaction = self.client.post(f"/api/posts/{post_id}/react", headers=self.auth(viewer))
        self.assertTrue(reaction.get_json()["liked"])
        second = self.client.post(f"/api/posts/{post_id}/react", headers=self.auth(viewer))
        self.assertFalse(second.get_json()["liked"])

        comment = self.client.post(f"/api/posts/{post_id}/comments", headers=self.auth(viewer), json={
            "content": "You are not alone.", "is_anonymous": True,
        })
        self.assertEqual(comment.status_code, 201)
        comments = self.client.get(f"/api/posts/{post_id}/comments").get_json()
        self.assertEqual(comments[0]["author_name"], "Anonymous Writer")
        self.assertIsNone(comments[0]["user_id"])

    def test_moderation_duplicate_reports_and_account_security(self):
        owner = self.register("secure_owner", "secure-owner@example.com")
        reporter = self.register("safe_reporter", "reporter@example.com")
        post = self.client.post("/api/posts", headers=self.auth(owner), json={
            "content": "A normal post", "category": "other",
        }).get_json()
        post_id = post["post_id"]
        first = self.client.post(f"/api/posts/{post_id}/report", headers=self.auth(reporter), json={"reason": "Spam content"})
        self.assertEqual(first.status_code, 200)
        duplicate = self.client.post(f"/api/posts/{post_id}/report", headers=self.auth(reporter), json={"reason": "Spam content"})
        self.assertEqual(duplicate.status_code, 409)
        own_report = self.client.post(f"/api/posts/{post_id}/report", headers=self.auth(owner), json={"reason": "My own post"})
        self.assertEqual(own_report.status_code, 403)

        changed = self.client.post("/api/users/me/password", headers=self.auth(owner), json={
            "current_password": "correct-horse-battery", "new_password": "an-even-better-password",
        })
        self.assertEqual(changed.status_code, 200)
        old_token = self.client.get("/api/auth/me", headers=self.auth(owner))
        self.assertEqual(old_token.status_code, 401)

    def test_chat_is_private_persistent_and_crisis_aware(self):
        member = self.register("chat_member", "chat@example.com")
        outsider = self.register("chat_outsider", "outsider@example.com")
        created = self.client.post("/api/chat/conversations", headers=self.auth(member))
        self.assertEqual(created.status_code, 201)
        conversation_id = created.get_json()["id"]

        response = self.client.post(
            f"/api/chat/conversations/{conversation_id}/messages",
            headers=self.auth(member),
            json={"content": "I feel anxious and overwhelmed."},
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["mode"], "local")
        saved = self.client.get(f"/api/chat/conversations/{conversation_id}/messages", headers=self.auth(member))
        self.assertEqual(len(saved.get_json()), 2)
        forbidden = self.client.get(f"/api/chat/conversations/{conversation_id}/messages", headers=self.auth(outsider))
        self.assertEqual(forbidden.status_code, 404)

        crisis = self.client.post(
            f"/api/chat/conversations/{conversation_id}/messages",
            headers=self.auth(member),
            json={"content": "I want to end my life."},
        )
        self.assertEqual(crisis.get_json()["mode"], "crisis")
        self.assertIn("112", crisis.get_json()["assistant_message"]["content"])

    def test_private_diary_insights_and_notifications(self):
        writer = self.register("diary_writer", "diary@example.com")
        supporter = self.register("diary_supporter", "supporter@example.com")
        entry = self.client.post("/api/diary", headers=self.auth(writer), json={
            "title": "A calmer day", "content": "I took a short walk and slowed down.", "mood": "calm",
        })
        self.assertEqual(entry.status_code, 201)
        entry_id = entry.get_json()["id"]
        self.assertEqual(self.client.get("/api/diary", headers=self.auth(writer)).status_code, 200)
        self.assertEqual(self.client.get(f"/api/diary/{entry_id}", headers=self.auth(supporter)).status_code, 404)
        insights = self.client.get("/api/insights", headers=self.auth(writer)).get_json()
        self.assertEqual(insights["totals"]["entries"], 1)
        self.assertEqual(insights["moods"][0]["label"], "calm")

        post_id = self.client.post("/api/posts", headers=self.auth(writer), json={
            "content": "Today was difficult.", "category": "emotional", "is_anonymous": True,
        }).get_json()["post_id"]
        self.client.post(f"/api/posts/{post_id}/comments", headers=self.auth(supporter), json={"content": "I hear you."})
        notifications = self.client.get("/api/notifications", headers=self.auth(writer)).get_json()
        self.assertEqual(len(notifications), 1)
        self.assertIn("diary_supporter", notifications[0]["message"])
        self.client.post("/api/notifications/read", headers=self.auth(writer))
        self.assertEqual(self.client.get("/api/notifications", headers=self.auth(writer)).get_json()[0]["is_read"], 1)

    def test_post_and_comment_deletion_and_comment_reporting(self):
        author = self.register("del_author", "del_author@example.com")
        commenter = self.register("del_commenter", "del_commenter@example.com")
        stranger = self.register("del_stranger", "del_stranger@example.com")

        post = self.client.post("/api/posts", headers=self.auth(author), json={
            "content": "A post to be deleted later.", "category": "social",
        }).get_json()
        post_id = post["post_id"]

        comment = self.client.post(f"/api/posts/{post_id}/comments", headers=self.auth(commenter), json={
            "content": "A comment on the post.",
        }).get_json()
        comment_id = comment["comment_id"]

        # Reporting comment
        rep_resp = self.client.post(f"/api/posts/{post_id}/comments/{comment_id}/report", headers=self.auth(stranger), json={"reason": "Inappropriate comment."})
        self.assertEqual(rep_resp.status_code, 200)

        # Stranger cannot delete comment
        del_fail = self.client.delete(f"/api/posts/{post_id}/comments/{comment_id}", headers=self.auth(stranger))
        self.assertEqual(del_fail.status_code, 403)

        # Commenter can delete their comment
        del_ok = self.client.delete(f"/api/posts/{post_id}/comments/{comment_id}", headers=self.auth(commenter))
        self.assertEqual(del_ok.status_code, 204)

        # Stranger cannot delete post
        post_del_fail = self.client.delete(f"/api/posts/{post_id}", headers=self.auth(stranger))
        self.assertEqual(post_del_fail.status_code, 403)

        # Author can delete their post
        post_del_ok = self.client.delete(f"/api/posts/{post_id}", headers=self.auth(author))
        self.assertEqual(post_del_ok.status_code, 204)
        self.assertEqual(self.client.get(f"/api/posts/{post_id}").status_code, 404)

    def test_user_posts_export_and_preferences(self):
        user = self.register("exp_user", "exp_user@example.com")
        auth_header = self.auth(user)

        self.client.post("/api/diary", headers=auth_header, json={
            "title": "Private Entry", "content": "Confidential thought", "mood": "hopeful",
        })
        created_post = self.client.post("/api/posts", headers=auth_header, json={
            "content": "My public post for testing export and user post listing", "category": "financial",
        })
        post_id = created_post.get_json()["post_id"]

        # Test GET /api/users/me/posts
        my_posts = self.client.get("/api/users/me/posts", headers=auth_header)
        self.assertEqual(my_posts.status_code, 200)
        posts_data = my_posts.get_json()
        self.assertEqual(len(posts_data), 1)
        self.assertEqual(posts_data[0]["category"], "financial")

        # Test GET /api/users/me/export
        export_resp = self.client.get("/api/users/me/export", headers=auth_header)
        self.assertEqual(export_resp.status_code, 200)
        export_json = export_resp.get_json()
        self.assertEqual(len(export_json["diary_entries"]), 1)
        self.assertEqual(len(export_json["posts"]), 1)
        self.assertEqual(export_json["user"]["username"], "exp_user")

        # Test preferences GET & PATCH
        pref_get = self.client.get("/api/users/me/preferences", headers=auth_header)
        self.assertEqual(pref_get.status_code, 200)
        self.assertEqual(pref_get.get_json()["preferences"]["default_anonymous"], 1)
        self.assertEqual(pref_get.get_json()["preferences"]["ai_support_enabled"], 0)

        disabled_ai = self.client.post(f"/api/posts/{post_id}/ai-insight", headers=auth_header)
        self.assertEqual(disabled_ai.status_code, 403)
        self.assertEqual(disabled_ai.get_json()["code"], "ai_support_disabled")

        pref_patch = self.client.patch("/api/users/me/preferences", headers=auth_header, json={
            "default_anonymous": False,
            "email_notifications": False,
        })
        self.assertEqual(pref_patch.status_code, 200)
        self.assertEqual(pref_patch.get_json()["preferences"]["default_anonymous"], 0)
        self.assertEqual(pref_patch.get_json()["preferences"]["email_notifications"], 0)

        enable_ai = self.client.patch("/api/users/me/preferences", headers=auth_header, json={"ai_support_enabled": True})
        self.assertEqual(enable_ai.status_code, 200)
        self.assertEqual(enable_ai.get_json()["preferences"]["ai_support_enabled"], 1)
        # Partial preference updates must preserve earlier choices.
        self.assertEqual(enable_ai.get_json()["preferences"]["default_anonymous"], 0)
        self.assertEqual(enable_ai.get_json()["preferences"]["email_notifications"], 0)

        enabled_ai = self.client.post(f"/api/posts/{post_id}/ai-insight", headers=auth_header)
        self.assertEqual(enabled_ai.status_code, 200)
        self.assertIn("insight", enabled_ai.get_json())

    def test_post_search_pagination_and_admin_actions(self):
        creator = self.register("search_creator", "search_creator@example.com")
        self.client.post("/api/posts", headers=self.auth(creator), json={
            "content": "UniqueSearchKeyword finding peace in nature", "category": "other",
        })
        self.client.post("/api/posts", headers=self.auth(creator), json={
            "content": "Another normal post", "category": "social",
        })

        # Search
        search_res = self.client.get("/api/posts?q=UniqueSearchKeyword")
        self.assertEqual(search_res.status_code, 200)
        self.assertEqual(len(search_res.get_json()), 1)
        self.assertIn("UniqueSearchKeyword", search_res.get_json()[0]["content"])

        # Pagination limit
        paged_res = self.client.get("/api/posts?limit=1")
        self.assertEqual(paged_res.status_code, 200)
        self.assertEqual(len(paged_res.get_json()), 1)

    def test_health_endpoint_and_latency(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["database"], "ok")
        self.assertIn("latency_ms", data)
        self.assertLess(data["latency_ms"], 100.0)  # sub-100ms DB check


if __name__ == "__main__":
    unittest.main()
