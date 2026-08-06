import threading
from django.core.mail import send_mail as django_send_mail

class EmailThread(threading.Thread):
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs
        threading.Thread.__init__(self)

    def run(self):
        try:
            django_send_mail(*self.args, **self.kwargs)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error sending email in background thread: {e}")

def send_mail_async(*args, **kwargs):
    """
    Asynchronous wrapper for Django's send_mail function.
    This prevents the main thread (and thus the API response) from blocking
    if the SMTP server connection hangs or is slow, avoiding Gunicorn worker timeouts (502 Bad Gateway).
    """
    EmailThread(*args, **kwargs).start()
