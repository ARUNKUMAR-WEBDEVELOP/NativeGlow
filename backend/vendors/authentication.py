from django.db import DatabaseError, OperationalError, close_old_connections
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework.exceptions import APIException

from .models import Vendor


class ServiceUnavailable(APIException):
    status_code = 503
    default_detail = 'Service is temporarily unavailable. Please try again in a moment.'
    default_code = 'service_unavailable'


class VendorJWTAuthentication(JWTAuthentication):
    """JWT auth for vendor-scoped endpoints using the Vendor model."""

    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
        except InvalidToken as e:
            raise AuthenticationFailed(str(e))

        token_role = validated_token.get('role')
        if token_role and token_role != 'vendor':
            raise AuthenticationFailed('Token is not a vendor token.')

        vendor_id = validated_token.get('vendor_id') or validated_token.get('user_id')
        if not vendor_id:
            raise AuthenticationFailed('No vendor_id in token.')

        try:
            vendor = Vendor.objects.get(id=vendor_id)
            request.vendor = vendor
        except (DatabaseError, OperationalError):
            # A brief reconnect attempt helps with transient pooler hiccups.
            close_old_connections()
            try:
                vendor = Vendor.objects.get(id=vendor_id)
                request.vendor = vendor
            except (DatabaseError, OperationalError):
                raise ServiceUnavailable('Database is temporarily unavailable. Please try again in a moment.')
        except Vendor.DoesNotExist:
            raise AuthenticationFailed('Vendor not found.')

        setattr(vendor, 'is_authenticated', True)
        return (vendor, validated_token)
