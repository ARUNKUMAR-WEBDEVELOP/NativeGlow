import socket
import logging
import threading
from django.core.mail import send_mail as django_send_mail
from django.core.mail.backends.smtp import EmailBackend as DjangoSmtpEmailBackend

logger = logging.getLogger(__name__)


def force_ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    """
    Helper to force socket DNS queries to IPv4 (AF_INET) only.
    Prevents IPv6 socket creation on cloud environments (like Render)
    which lack outbound IPv6 network routes, preventing [Errno 101] Network is unreachable.
    """
    return socket.getaddrinfo(host, port, socket.AF_INET, type, proto, flags)


class IPv4SmtpEmailBackend(DjangoSmtpEmailBackend):
    """
    Custom SMTP Email Backend that forces IPv4 (AF_INET) connections.
    Render and containerized Linux environments often resolve dual-stack hosts 
    like smtp.gmail.com to IPv6 addresses first, but lack IPv6 routing interfaces.
    """
    def open(self):
        if self.connection:
            return False

        orig_getaddrinfo = socket.getaddrinfo
        socket.getaddrinfo = force_ipv4_getaddrinfo
        try:
            return super().open()
        finally:
            socket.getaddrinfo = orig_getaddrinfo


class EmailThread(threading.Thread):
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs
        threading.Thread.__init__(self)

    def run(self):
        orig_getaddrinfo = socket.getaddrinfo
        socket.getaddrinfo = force_ipv4_getaddrinfo
        try:
            django_send_mail(*self.args, **self.kwargs)
        except Exception as e:
            logger.error(f"Error sending email in background thread: {e}")
            if "101" in str(e) or "unreachable" in str(e).lower():
                logger.error(
                    "Network unreachable error during SMTP mail delivery. "
                    "Ensure EMAIL_HOST, EMAIL_PORT, and credentials (App Password) are correct."
                )
        finally:
            socket.getaddrinfo = orig_getaddrinfo


def send_mail_async(*args, **kwargs):
    """
    Asynchronous wrapper for Django's send_mail function.
    This prevents the main thread (and thus the API response) from blocking
    if the SMTP server connection hangs or is slow, avoiding Gunicorn worker timeouts (502 Bad Gateway).
    """
    EmailThread(*args, **kwargs).start()

