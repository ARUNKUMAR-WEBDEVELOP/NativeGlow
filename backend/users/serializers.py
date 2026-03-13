from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile, EmailOTP


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'phone')

    def create(self, validated_data):
        phone = validated_data.pop('phone', '')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        UserProfile.objects.create(user=user, phone=phone)
        return user


class UserSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(source='profile.phone', read_only=True)
    is_vendor = serializers.SerializerMethodField()

    def get_is_vendor(self, obj):
        return hasattr(obj, 'vendor_profile')

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone', 'is_vendor')
        read_only_fields = ('id', 'is_vendor')


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = (
            'user', 'phone', 'address', 'city',
            'state', 'pincode', 'country', 'created_at',
        )
        read_only_fields = ('created_at',)


class OTPRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=EmailOTP.PURPOSE_CHOICES)


class OTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=EmailOTP.PURPOSE_CHOICES)
    otp_code = serializers.CharField(max_length=6)
