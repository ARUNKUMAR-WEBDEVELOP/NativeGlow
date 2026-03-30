from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

from .models import Buyer


class BuyerJWTAuthentication(JWTAuthentication):
    """JWT auth for buyer-scoped endpoints."""

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

        if validated_token.get('role') != 'buyer':
            raise AuthenticationFailed('Token is not a buyer token.')

        buyer_id = validated_token.get('buyer_id')
        if not buyer_id:
            raise AuthenticationFailed('No buyer_id in token.')

        try:
            buyer = Buyer.objects.get(id=buyer_id, is_active=True)
            request.buyer = buyer
        except Buyer.DoesNotExist:
            raise AuthenticationFailed('Buyer not found or inactive.')

        setattr(buyer, 'is_authenticated', True)
        return (buyer, validated_token)
