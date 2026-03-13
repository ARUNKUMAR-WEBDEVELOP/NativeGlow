from rest_framework import serializers
from .models import Vendor, VendorApplication
from users.models import EmailOTP


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = (
            'id', 'brand_name', 'slug', 'description', 'product_types',
            'city', 'state', 'phone', 'is_natural_certified', 'status',
            'website', 'contact_email', 'commission_rate', 'payout_terms', 'joined_at',
        )
        read_only_fields = ('id', 'joined_at')


class VendorApplicationSerializer(serializers.ModelSerializer):
    otp_code = serializers.CharField(write_only=True, max_length=6)

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        otp_code = attrs.get('otp_code', '').strip()
        contact_email = attrs.get('contact_email', '').strip().lower()
        if not contact_email:
            raise serializers.ValidationError('Contact email is required for OTP verification.')

        if user and user.is_authenticated:
            if Vendor.objects.filter(user=user).exists():
                raise serializers.ValidationError(
                    'You are already an approved vendor on NativeGlow.'
                )

        if user and user.is_authenticated and VendorApplication.objects.filter(user=user, status='pending').exists():
            raise serializers.ValidationError(
                'You already have a pending vendor application.'
            )

        if VendorApplication.objects.filter(contact_email__iexact=contact_email, status='pending').exists():
            raise serializers.ValidationError('A pending application already exists for this contact email.')

        otp_record = EmailOTP.objects.filter(
            email=contact_email,
            purpose='vendor_apply',
            otp_code=otp_code,
            is_verified=True,
        ).first()
        if not otp_record:
            raise serializers.ValidationError('Email OTP is not verified. Complete OTP verification first.')

        return attrs

    def create(self, validated_data):
        validated_data.pop('otp_code', None)
        return super().create(validated_data)

    class Meta:
        model = VendorApplication
        fields = (
            'id', 'brand_name', 'product_types', 'why_collaborate',
            'current_sales_channels', 'contact_email', 'contact_phone',
            'otp_code', 'status', 'applied_at',
        )
        read_only_fields = ('id', 'status', 'applied_at')


class VendorApplicationReviewSerializer(serializers.ModelSerializer):
    """Used by admin staff to approve or reject applications."""

    def validate_status(self, value):
        if value not in ('approved', 'rejected'):
            raise serializers.ValidationError(
                'Status must be either approved or rejected for review.'
            )
        return value

    class Meta:
        model = VendorApplication
        fields = ('status', 'admin_notes', 'reviewed_at')
