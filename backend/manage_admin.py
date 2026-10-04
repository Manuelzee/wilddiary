"""One-time administrator bootstrap command.

Run from the backend directory:
    python manage_admin.py admin@example.com

The account must already have been registered through the application. This
command deliberately runs outside the public API so nobody can self-assign the
administrator role.
"""
import getpass
import sys

from db import init_db, transaction


def main():
    if len(sys.argv) != 2 or "@" not in sys.argv[1]:
        raise SystemExit("Usage: python manage_admin.py admin@example.com")
    email = sys.argv[1].strip().lower()
    confirmation = getpass.getpass(f"Type the account email again to promote {email}: ").strip().lower()
    if confirmation != email:
        raise SystemExit("Confirmation did not match. No changes made.")
    init_db()
    with transaction() as connection:
        account = connection.execute("SELECT id,username,role FROM users WHERE email=?", (email,)).fetchone()
        if not account:
            raise SystemExit("No registered account has that email. Register it first, then rerun this command.")
        connection.execute("UPDATE users SET role='admin',is_active=1,updated_at=CURRENT_TIMESTAMP WHERE id=?", (account["id"],))
    print(f"{account['username']} is now an administrator. Sign out and back in to open /admin.")


if __name__ == "__main__":
    main()
