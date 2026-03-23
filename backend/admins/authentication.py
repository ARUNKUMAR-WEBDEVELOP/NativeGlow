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
    4. Raise AuthenticationFailed if not an admin token
    """

    def authenticate(self, request):
        """
        Authenticate the request using JWT and verify admin role.
        
        Returns:
            tuple: (user, validated_token) or None
        Raises:
            AuthenticationFailed: If token is missing, invalid, or not an admin token
        """
        # Call parent JWTAuthentication to get the validated token
        result = super().authenticate(request)

        if result is None:
            return None

        user, validated_token = result

        # Check if token has role == "admin"
        token_role = validated_token.get('role')
        if token_role != 'admin':
            raise AuthenticationFailed('Token is not an admin token.')

        # Extract admin_id from token
        admin_id = validated_token.get('admin_id')
        if not admin_id:
            raise AuthenticationFailed('No admin_id in token.')

        # Fetch AdminUser object and attach to request
        try:
            admin_user = AdminUser.objects.get(id=admin_id)
            request.admin_user = admin_user
        except AdminUser.DoesNotExist:
            raise AuthenticationFailed('Admin user not found.')

        return (user, validated_token)
