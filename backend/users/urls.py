from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    LoginView,
    ProfileView,
    GoogleLoginView,
    OTPRequestView,
    OTPVerifyView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='user-register'),
    path('login/', LoginView.as_view(), name='user-login'),
    path('google/', GoogleLoginView.as_view(), name='user-google-login'),
    path('otp/request/', OTPRequestView.as_view(), name='user-otp-request'),
    path('otp/verify/', OTPVerifyView.as_view(), name='user-otp-verify'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('profile/', ProfileView.as_view(), name='user-profile'),
]
