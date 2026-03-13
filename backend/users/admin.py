from django.contrib import admin
from .models import UserProfile, EmailOTP


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone', 'city', 'country', 'created_at')
    search_fields = ('user__email', 'user__username', 'city')


@admin.register(EmailOTP)
class EmailOTPAdmin(admin.ModelAdmin):
    list_display = ('email', 'purpose', 'otp_code', 'is_verified', 'expires_at', 'created_at')
    list_filter = ('purpose', 'is_verified')
    search_fields = ('email',)
