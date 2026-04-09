import logging

from django.db import DatabaseError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """Always return JSON payloads for DRF exceptions and unexpected failures."""
    response = drf_exception_handler(exc, context)

    if response is not None:
        if response.data is None:
            response.data = {'detail': 'Something went wrong. Please try again.'}
        elif isinstance(response.data, str):
            response.data = {'detail': response.data}
        elif isinstance(response.data, list):
            response.data = {'detail': response.data}
        elif isinstance(response.data, dict) and 'detail' not in response.data:
            response.data = {'detail': response.data}
        return response

    view_name = context.get('view').__class__.__name__ if context.get('view') else 'unknown'

    if isinstance(exc, DatabaseError):
        logger.exception('Database error in %s', view_name)
        return Response(
            {'detail': 'Database operation failed. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    logger.exception('Unhandled API error in %s', view_name)
    return Response(
        {'detail': 'Something went wrong. Please try again.'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
