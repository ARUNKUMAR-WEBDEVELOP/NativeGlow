import socket
import logging
import threading
import json
import urllib.request
import os
from django.conf import settings
from django.core.mail import send_mail as django_send_mail
from django.core.mail.backends.smtp import EmailBackend as DjangoSmtpEmailBackend

logger = logging.getLogger(__name__)

_original_getaddrinfo = socket.getaddrinfo


def force_ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    """
    Helper to force socket DNS queries to IPv4 (AF_INET) only.
    Prevents IPv6 socket creation on cloud environments (like Render)
    which lack outbound IPv6 network routes, preventing [Errno 101] Network is unreachable.
    """
    return _original_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)


def send_email_via_http_api(message_obj):
    """
    Sends an email using HTTPS REST API (Resend, SendGrid, or Brevo).
    HTTP APIs use port 443 which is never blocked by cloud container hosting providers (Render, Heroku, AWS).
    Returns True if sent successfully, False otherwise.
    """
    resend_key = os.environ.get('RESEND_API_KEY', '').strip()
    sendgrid_key = os.environ.get('SENDGRID_API_KEY', '').strip()
    brevo_key = os.environ.get('BREVO_API_KEY', '').strip() or os.environ.get('SENDINBLUE_API_KEY', '').strip()

    from_email = message_obj.from_email or getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@nativeglow.com')
    recipients = message_obj.to
    subject = message_obj.subject
    body = message_obj.body

    if resend_key:
        try:
            sender = from_email if ('@' in from_email and not from_email.endswith('@nativeglow.com')) else 'NativeGlow <onboarding@resend.dev>'
            payload = json.dumps({
                'from': sender,
                'to': recipients,
                'subject': subject,
                'text': body,
            }).encode('utf-8')
            req = urllib.request.Request(
                'https://api.resend.com/emails',
                data=payload,
                headers={
                    'Authorization': f'Bearer {resend_key}',
                    'Content-Type': 'application/json',
                },
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status in (200, 201):
                    logger.info(f"Email sent successfully via Resend HTTP API to {recipients}")
                    return True
        except Exception as e:
            logger.error(f"Resend HTTP API error: {e}")

    if sendgrid_key:
        try:
            payload = json.dumps({
                'personalizations': [{'to': [{'email': r} for r in recipients]}],
                'from': {'email': from_email},
                'subject': subject,
                'content': [{'type': 'text/plain', 'value': body}],
            }).encode('utf-8')
            req = urllib.request.Request(
                'https://api.sendgrid.com/v3/mail/send',
                data=payload,
                headers={
                    'Authorization': f'Bearer {sendgrid_key}',
                    'Content-Type': 'application/json',
                },
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status in (200, 202):
                    logger.info(f"Email sent successfully via SendGrid HTTP API to {recipients}")
                    return True
        except Exception as e:
            logger.error(f"SendGrid HTTP API error: {e}")

    if brevo_key:
        try:
            payload = json.dumps({
                'sender': {'email': from_email, 'name': 'NativeGlow'},
                'to': [{'email': r} for r in recipients],
                'subject': subject,
                'textContent': body,
            }).encode('utf-8')
            req = urllib.request.Request(
                'https://api.brevo.com/v3/smtp/email',
                data=payload,
                headers={
                    'api-key': brevo_key,
                    'Content-Type': 'application/json',
                },
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status in (200, 201):
                    logger.info(f"Email sent successfully via Brevo HTTP API to {recipients}")
                    return True
        except Exception as e:
            logger.error(f"Brevo HTTP API error: {e}")

    return False


class IPv4SmtpEmailBackend(DjangoSmtpEmailBackend):
    """
    Custom Email Backend that:
    1. Tries HTTP REST API (Resend / SendGrid / Brevo) first if API keys are set.
    2. Fallbacks to IPv4 forced SMTP with automatic port 465 (SSL) retry if port 587 times out.
    """
    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        # Attempt HTTP API sending if configured
        if os.environ.get('RESEND_API_KEY') or os.environ.get('SENDGRID_API_KEY') or os.environ.get('BREVO_API_KEY'):
            sent_count = 0
            for msg in email_messages:
                if send_email_via_http_api(msg):
                    sent_count += 1
            if sent_count > 0:
                return sent_count

        socket.getaddrinfo = force_ipv4_getaddrinfo
        try:
            return super().send_messages(email_messages)
        except Exception as e:
            err_msg = str(e).lower()
            if ("timed out" in err_msg or "timeout" in err_msg) and self.port == 587 and "gmail" in self.host.lower():
                logger.warning("SMTP port 587 timed out. Retrying via Gmail SSL port 465...")
                try:
                    alt_backend = DjangoSmtpEmailBackend(
                        host=self.host,
                        port=465,
                        username=self.username,
                        password=self.password,
                        use_tls=False,
                        use_ssl=True,
                        timeout=self.timeout,
                        fail_silently=self.fail_silently,
                    )
                    return alt_backend.send_messages(email_messages)
                except Exception as alt_err:
                    logger.error(f"Gmail SSL port 465 fallback also failed: {alt_err}")
            raise e
        finally:
            socket.getaddrinfo = _original_getaddrinfo


class EmailThread(threading.Thread):
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs
        threading.Thread.__init__(self)

    def run(self):
        socket.getaddrinfo = force_ipv4_getaddrinfo
        try:
            django_send_mail(*self.args, **self.kwargs)
        except Exception as e:
            logger.error(f"Error sending email in background thread: {e}")
            if "timed out" in str(e).lower() or "timeout" in str(e).lower():
                logger.error(
                    "SMTP connection timed out. Port 587 may be blocked by your host (Render). "
                    "Try setting EMAIL_PORT=465 & EMAIL_USE_SSL=True, or use RESEND_API_KEY."
                )
        finally:
            socket.getaddrinfo = _original_getaddrinfo


def send_mail_async(*args, **kwargs):
    """
    Asynchronous wrapper for Django's send_mail function.
    This prevents the main thread (and thus the API response) from blocking
    if the SMTP server connection hangs or is slow, avoiding Gunicorn worker timeouts (502 Bad Gateway).
    """
    EmailThread(*args, **kwargs).start()


