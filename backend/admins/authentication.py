from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

from .models import AdminUser


class AdminJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication for admin endpoints.

    Extends JWTAuthentication to:
    1. Verify token exists in Authorization header
    2. Verify role == "admin" in token payload
    3. Attach admin user to request.admin_user
    4. For superadmins: enforce single-device session by comparing
       the device_id in the JWT against active_device_id in the DB.
       If they differ, the session has been evicted by a newer login.
    """

    def authenticate(self, request):
        """
        Authenticate the request using JWT and verify admin role.

        Returns:
            tuple: (user, validated_token) or None
        Raises:
            AuthenticationFailed: If token is missing, invalid, not an admin token,
                                   or the superadmin session has been evicted.
        """
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

        # ── Check role claim ───────────────────────────────────────────────────
        token_role = validated_token.get('role')
        if token_role != 'admin':
            raise AuthenticationFailed('Token is not an admin token.')

        # ── Extract admin_id from token ────────────────────────────────────────
        admin_id = validated_token.get('admin_id')
        if not admin_id:
            raise AuthenticationFailed('No admin_id in token.')

        token_device_id = validated_token.get('device_id', '').strip()

        # ── Fetch AdminUser and enforce single-device session ──────────────────
        try:
            admin_user = AdminUser.objects.get(id=admin_id)
        except AdminUser.DoesNotExist:
            raise AuthenticationFailed('Admin user not found.')

        if admin_user.is_superadmin:
            # Require device_id header on every request
            request_device_id = (
                request.headers.get('X-Device-ID', '').strip()
                or request.META.get('HTTP_X_DEVICE_ID', '').strip()
            )
            if not request_device_id:
                raise AuthenticationFailed('Device ID is required for superadmin access.')

            # Single-device check: the active_device_id in the DB is the
            # *only* device allowed. If this token's device_id no longer matches
            # it means a newer login evicted this session.
            active_device = admin_user.active_device_id.strip()

            if not active_device:
                raise AuthenticationFailed('No active session found. Please log in again.')

            if request_device_id != active_device or token_device_id != active_device:
                raise AuthenticationFailed(
                    'Session expired. This account has been logged in from another device.'
                )

        request.admin_user = admin_user

        # Mark as authenticated for DRF IsAuthenticated permission checks.
        setattr(admin_user, 'is_authenticated', True)
        return (admin_user, validated_token)
