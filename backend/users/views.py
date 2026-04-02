import os
import random
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from .models import UserProfile, EmailOTP
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    UserProfileSerializer,
    OTPRequestSerializer,
    OTPVerifySerializer,
)


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/  — register a new customer account."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/  — returns access + refresh JWT tokens."""
    permission_classes = (permissions.AllowAny,)


class ProfileView(APIView):
    """GET / PUT /api/auth/profile/  — view or update the current user's profile."""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response(UserProfileSerializer(profile).data)

    def put(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(
            profile, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class GoogleLoginView(APIView):
    """POST /api/auth/google/  — exchange Google ID token for local JWT tokens."""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        token = request.data.get('id_token')
        if not token:
            return Response({'detail': 'id_token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        client_id = os.environ.get('GOOGLE_CLIENT_ID', '').strip()
        if not client_id:
            return Response(
                {'detail': 'Google login is not configured on the server.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            info = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
        except ValueError:
            return Response({'detail': 'Invalid Google token.'}, status=status.HTTP_400_BAD_REQUEST)

        email = (info.get('email') or '').strip().lower()
        if not email:
            return Response({'detail': 'Google account email is unavailable.'}, status=status.HTTP_400_BAD_REQUEST)

        base_username = email.split('@')[0][:120] or 'nativeglow_user'
        username = base_username
        suffix = 1
        while User.objects.filter(username=username).exclude(email=email).exists():
            suffix += 1
            username = f'{base_username[:100]}_{suffix}'

        user, _ = User.objects.get_or_create(
            email=email,
            defaults={
                'username': username,
                'first_name': info.get('given_name', ''),
                'last_name': info.get('family_name', ''),
            },
        )

        if not hasattr(user, 'profile'):
            UserProfile.objects.get_or_create(user=user)

        full_name = f"{(user.first_name or '').strip()} {(user.last_name or '').strip()}".strip() or user.username
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user_name': full_name,
                'user_email': user.email,
                'user_picture': info.get('picture', ''),
            }
        )


class OTPRequestView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        email = data['email'].strip().lower()
        purpose = data['purpose']

        code = f"{random.randint(0, 999999):06d}"
        otp = EmailOTP.objects.create(
            email=email,
            purpose=purpose,
            otp_code=code,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        try:
            send_mail(
                subject='NativeGlow OTP Verification',
                message=f'Your NativeGlow OTP is {code}. It expires in 10 minutes.',
                from_email='no-reply@nativeglow.store',
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception:
            pass

        response_payload = {'detail': 'OTP sent to email.'}
        if os.environ.get('DEBUG', '1') == '1':
            response_payload['otp_debug'] = otp.otp_code
        return Response(response_payload, status=status.HTTP_201_CREATED)


class OTPVerifyView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        email = data['email'].strip().lower()

        otp = EmailOTP.objects.filter(
            email=email,
            purpose=data['purpose'],
            otp_code=data['otp_code'],
            is_verified=False,
        ).first()

        if not otp:
            return Response({'detail': 'Invalid OTP.'}, status=status.HTTP_400_BAD_REQUEST)
        if timezone.now() > otp.expires_at:
            return Response({'detail': 'OTP expired.'}, status=status.HTTP_400_BAD_REQUEST)

        otp.is_verified = True
        otp.save(update_fields=['is_verified'])
        return Response({'detail': 'OTP verified successfully.'})
