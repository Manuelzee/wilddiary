import json
import logging
import os
import urllib.error
import urllib.request

logger = logging.getLogger("wilddiary.email")


def send_password_reset_email(to_email: str, otp_code: str) -> dict:
    """Send a 6-digit OTP password reset email via Resend API.

    Uses the RESEND_API_KEY from environment variables. If no key is set
    (e.g., in local development or test mode), safely logs the OTP code and returns
    a simulated delivery payload so execution never crashes.
    """
    api_key = (os.getenv("RESEND_API_KEY") or "").strip()
    from_email = (os.getenv("RESEND_FROM_EMAIL") or "Wild Diary <onboarding@resend.dev>").strip()

    subject = f"Your Wild Diary Password Reset Code: {otp_code}"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {{
      margin: 0;
      padding: 32px 16px;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
    }}
    .container {{
      max-width: 520px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      padding: 40px 32px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
    }}
    .brand {{
      display: inline-block;
      font-size: 22px;
      font-weight: 800;
      color: #7c3aed;
      letter-spacing: -0.5px;
      margin-bottom: 24px;
    }}
    h1 {{
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 12px 0;
      letter-spacing: -0.3px;
    }}
    p {{
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 16px 0;
    }}
    .otp-wrapper {{
      background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
      border: 1.5px dashed #a855f7;
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin: 28px 0;
    }}
    .otp-code {{
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 40px;
      font-weight: 900;
      letter-spacing: 10px;
      color: #7c3aed;
      margin-left: 10px;
    }}
    .otp-expiry {{
      font-size: 12px;
      font-weight: 600;
      color: #9333ea;
      margin-top: 10px;
    }}
    .security-notice {{
      font-size: 13px;
      color: #64748b;
      background: #f1f5f9;
      padding: 14px 18px;
      border-radius: 12px;
      margin-top: 24px;
      line-height: 1.5;
    }}
    .footer {{
      margin-top: 32px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">🌱 Wild Diary</div>
    <h1>Password Reset Verification</h1>
    <p>We received a request to reset your password for Wild Diary. Use the one-time verification code below to proceed:</p>
    <div class="otp-wrapper">
      <div class="otp-code">{otp_code}</div>
      <div class="otp-expiry">⏱ Valid for the next 15 minutes</div>
    </div>
    <div class="security-notice">
      <strong>Didn't request this?</strong> If you didn't ask to reset your password, you can safely ignore this email. Your current password remains secure.
    </div>
  </div>
  <div class="footer">
    Sent by Wild Diary &bull; A confidential, supportive space for personal reflection and growth.
  </div>
</body>
</html>"""

    text_content = (
        f"Wild Diary Password Reset\n\n"
        f"Your verification code is: {otp_code}\n\n"
        f"This code will expire in 15 minutes.\n"
        f"If you did not request this reset, please ignore this email."
    )

    if not api_key or to_email.lower().endswith(("@example.com", "@example.org", "@example.net", "@test.com")):
        logger.info(
            "Simulated email delivery for %s with code %s",
            to_email,
            otp_code,
        )
        return {
            "success": True,
            "simulated": True,
            "id": "simulated",
            "message": "Simulated email sent for test domain.",
        }

    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
        "text": text_content,
    }

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "WildDiary-Backend/1.0",
        },
        method="POST",
    )

    ssl_context = None
    try:
        import ssl
        ssl_context = ssl.create_default_context()
        if hasattr(ssl, "TLSVersion"):
            ssl_context.maximum_version = ssl.TLSVersion.TLSv1_2
    except Exception:
        ssl_context = None

    try:
        open_kwargs = {"timeout": 12}
        if ssl_context is not None:
            open_kwargs["context"] = ssl_context
        with urllib.request.urlopen(req, **open_kwargs) as response:
            resp_body = response.read().decode("utf-8")
            data = json.loads(resp_body) if resp_body else {}
            logger.info("Resend email successfully dispatched to %s: %s", to_email, data.get("id"))
            return {"success": True, "id": data.get("id")}
    except urllib.error.HTTPError as err:
        err_msg = err.read().decode("utf-8", errors="ignore")
        logger.error("Resend API returned HTTP %s: %s", err.code, err_msg)
        raise RuntimeError(f"Email service error ({err.code}): {err_msg}")
    except Exception as err:
        logger.error("Failed to connect to Resend API: %s", err)
        raise RuntimeError(f"Unable to reach email service: {err}")
