from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

from .models import Vendor


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
        except Vendor.DoesNotExist:
            raise AuthenticationFailed('Vendor not found.')

        setattr(vendor, 'is_authenticated', True)
        return (vendor, validated_token)
