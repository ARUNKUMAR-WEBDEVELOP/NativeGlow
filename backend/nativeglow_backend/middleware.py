import logging

from django.core.exceptions import ObjectDoesNotExist
from django.db import DatabaseError
from django.http import JsonResponse


logger = logging.getLogger(__name__)


class ApiJsonExceptionMiddleware:
    """Ensure all /api responses on unhandled exceptions are valid JSON."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        except ObjectDoesNotExist as exc:
            if request.path.startswith('/api/'):
                logger.warning('Missing object for API request %s: %s', request.path, exc)
                return JsonResponse({'detail': 'Requested data was not found.'}, status=404)
            raise
        except DatabaseError:
            if request.path.startswith('/api/'):
                logger.exception('Database failure for API request %s', request.path)
                return JsonResponse({'detail': 'Database temporarily unavailable. Please try again.'}, status=503)
            raise
        except Exception:
            if request.path.startswith('/api/'):
                logger.exception('Unhandled server error for API request %s', request.path)
                return JsonResponse({'detail': 'Something went wrong. Please try again.'}, status=500)
            raise