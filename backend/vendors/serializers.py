import os
from urllib import parse, request as urllib_request

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework import serializers
from .models import Vendor, VendorApplication
from users.models import EmailOTP


def verify_google_token(google_token):
    client_id = os.environ.get('GOOGLE_CLIENT_ID', '').strip()
    if not client_id:
        raise serializers.ValidationError('Google login is not configured on the server.')

    # Preferred: verify ID token JWT
    try:
        info = id_token.verify_oauth2_token(google_token, google_requests.Request(), client_id)
        email = (info.get('email') or '').strip().lower()
        sub = (info.get('sub') or '').strip()
        name = (info.get('name') or '').strip()
        email_verified = bool(info.get('email_verified'))
        if email and sub:
            return {
                'email': email,
                'google_id': sub,
                'name': name,
                'email_verified': email_verified,
            }
    except Exception:
        pass

    # Fallback: access token via Google userinfo endpoint
    try:
        params = parse.urlencode({'access_token': google_token})
        url = f'https://www.googleapis.com/oauth2/v3/userinfo?{params}'
        with urllib_request.urlopen(url, timeout=8) as resp:
            import json
            info = json.loads(resp.read().decode('utf-8'))
        email = (info.get('email') or '').strip().lower()
        sub = (info.get('sub') or '').strip()
        name = (info.get('name') or '').strip()
        email_verified = bool(info.get('email_verified'))
        if not email or not sub:
            raise serializers.ValidationError('Google token did not provide required identity fields.')
        return {
            'email': email,
            'google_id': sub,
            'name': name,
            'email_verified': email_verified,
        }
    except Exception:
        raise serializers.ValidationError('Invalid Google token. Please sign in with Google again.')


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


# ============================================================================
# VENDOR AUTHENTICATION SERIALIZERS
# ============================================================================

class VendorRegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for vendor registration.
    POST /api/vendor/register/
    
    Note: Password is auto-generated if not provided.
    Generated password is returned in response so vendor knows their login credentials.
    Social media URL (Instagram or YouTube) is required for vendor verification and brand authenticity.
    """
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        help_text='Optional. If not provided, a secure password will be auto-generated.'
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True
    )
    google_token = serializers.CharField(write_only=True, required=True, allow_blank=False, help_text='Google login is mandatory for vendor registration')
    social_media_url = serializers.CharField(required=True, allow_blank=False, write_only=True)

    class Meta:
        model = Vendor
        fields = (
            'full_name', 'email', 'password', 'confirm_password',
            'google_token',
            'business_name', 'whatsapp_number', 'city',
            'product_category', 'social_media_url',
            'natural_only_confirmed', 'terms_accepted',
            'upi_id', 'bank_account_number', 'bank_ifsc', 'account_holder_name'
        )

    def validate(self, attrs):
        """Validate password confirmation, email uniqueness, and social media URLs."""
        import re
        
        password = (attrs.get('password') or '').strip()
        confirm_password = (attrs.get('confirm_password') or '').strip()
        
        # Only validate if password is provided (not empty, not None)
        if password:
            if password != confirm_password:
                raise serializers.ValidationError({
                    'confirm_password': 'Passwords do not match.'
                })
            if len(password) < 8:
                raise serializers.ValidationError({
                    'password': 'Password must be at least 8 characters.'
                })

        # Preserve raw password for create(); remove form-only confirm field.
        attrs['_raw_password'] = password
        attrs.pop('password', None)
        attrs.pop('confirm_password', None)

        # Validate social media URL (Instagram or YouTube) for vendor verification
        social_media_url = (attrs.get('social_media_url') or '').strip()
        if not social_media_url:
            raise serializers.ValidationError({
                'social_media_url': 'Instagram or YouTube profile is required for vendor verification.'
            })
        
        # Check if it's a valid Instagram or YouTube URL/handle
        lower_url = social_media_url.lower()
        is_handle = re.match(r'^@[a-zA-Z0-9_]+$', social_media_url)
        is_instagram = 'instagram.com' in lower_url
        is_youtube = 'youtube.com' in lower_url or 'youtu.be' in lower_url
        
        if not (is_handle or is_instagram or is_youtube):
            raise serializers.ValidationError({
                'social_media_url': 'Please enter a valid Instagram (instagram.com/... or @handle) or YouTube (youtube.com/... or @channel) profile.'
            })
        
        attrs['social_media_url'] = social_media_url

        # Google login is MANDATORY for vendor registration
        google_token = (attrs.get('google_token') or '').strip()
        if not google_token:
            raise serializers.ValidationError({
                'google_token': 'Google login is required for vendor registration. Sign in with your Google account first.'
            })
        
        google_identity = verify_google_token(google_token)
        google_email = google_identity['email']
        google_id = google_identity['google_id']

        if Vendor.objects.filter(google_id=google_id).exists():
            raise serializers.ValidationError({
                'google_token': 'This Google account is already linked to an existing vendor account.'
            })

        if Vendor.objects.filter(email__iexact=google_email).exists():
            raise serializers.ValidationError({
                'email': 'A vendor with this email already exists.'
            })

        # Force email to be the Google-verified email
        attrs['email'] = google_email
        if not (attrs.get('full_name') or '').strip() and google_identity.get('name'):
            attrs['full_name'] = google_identity['name']
        attrs['_google_id'] = google_id
        attrs['_google_email_verified'] = bool(google_identity.get('email_verified'))

        attrs.pop('google_token', None)

        return attrs

    def create(self, validated_data):
        """Create vendor with smart auto-generated password from email + phone."""
        from django.contrib.auth.hashers import make_password

        # Map social_media_url to instagram_url field in the model
        social_media_url = validated_data.pop('social_media_url', '')
        
        # Generate or use provided password
        password = (validated_data.pop('_raw_password', '') or '').strip()
        
        if not password:
            # Smart auto-password generation:
            # First 4 letters of email + last 4 digits of phone number
            email = (validated_data.get('email') or '').strip().lower()
            phone = (validated_data.get('whatsapp_number') or '').strip()
            
            # Extract first 4 letters from email (before @)
            email_part = email.split('@')[0] if email else 'user'
            email_prefix = ''.join([c for c in email_part if c.isalpha()])[:4].lower()
            
            # Extract last 4 digits from phone
            phone_digits = ''.join([c for c in phone if c.isdigit()])[-4:] if phone else '0000'
            
            # Combine: email_prefix + phone_last4
            password = f"{email_prefix}{phone_digits}"
            
            # Ensure password is at least 8 characters (fallback if we got too few chars)
            if len(password) < 8:
                import secrets
                password = secrets.token_urlsafe(12)[:12]
        
        # Store the plain password to return in response
        plain_password = password
        
        # Hash the password for storage
        validated_data['password'] = make_password(password)
        google_id = validated_data.pop('_google_id', None)
        validated_data['google_id'] = google_id
        validated_data['google_email_verified'] = validated_data.pop('_google_email_verified', False)
        validated_data['registered_via_google'] = bool(google_id)
        
        # Map social_media_url to instagram_url field
        if social_media_url:
            validated_data['instagram_url'] = social_media_url

        vendor = Vendor.objects.create(**validated_data)
        
        # Store the plain password temporarily on the instance for response
        vendor._plain_password = plain_password
        
        return vendor


class VendorLoginSerializer(serializers.Serializer):
    """
    Serializer for vendor login.
    POST /api/vendor/login/
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        """Validate credentials and check if vendor is approved."""
        from django.contrib.auth.hashers import check_password
        
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password')

        try:
            vendor = Vendor.objects.get(email__iexact=email)
        except Vendor.DoesNotExist:
            raise serializers.ValidationError('Invalid email or password.')

        # Check if account is approved by admin
        if not vendor.is_approved:
            raise serializers.ValidationError(
                'Your account is pending admin approval. You will be notified by email once approved.'
            )

        # Validate password
        if not check_password(password, vendor.password):
            raise serializers.ValidationError('Invalid email or password.')

        # Check if account is active
        if not vendor.is_active:
            raise serializers.ValidationError('Your account has been deactivated.')

        attrs['vendor'] = vendor
        return attrs


class VendorProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for vendor profile (GET /api/vendor/me/).
    Read-only view of logged-in vendor's profile.
    """
    maintenance_due_status = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = (
            'id', 'full_name', 'email', 'business_name', 'vendor_slug',
            'city', 'whatsapp_number', 'upi_id', 'bank_account_number',
            'bank_ifsc', 'account_holder_name', 'is_approved', 'is_active',
            'maintenance_due', 'maintenance_due_status', 'created_at', 'updated_at'
        )
        read_only_fields = fields

    def get_maintenance_due_status(self, obj):
        """Return human-readable maintenance status."""
        if obj.maintenance_due:
            return 'Monthly maintenance fee is due'
        return 'No outstanding maintenance fee'


# ============================================================================
# VENDOR MAINTENANCE FEE SERIALIZERS
# ============================================================================

class MaintenanceFeeListSerializer(serializers.Serializer):
    """
    Serializer for listing vendor's maintenance fees.
    GET /api/vendor/maintenance/
    """
    id = serializers.IntegerField()
    month = serializers.CharField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    is_paid = serializers.BooleanField()
    payment_mode = serializers.CharField()
    verified_by_admin = serializers.BooleanField()
    submitted_at = serializers.DateTimeField()
    payment_status = serializers.SerializerMethodField()

    def get_payment_status(self, obj):
        """Return human-readable payment status with verification info."""
        if obj.is_paid and obj.verified_by_admin:
            return 'PAID & VERIFIED'
        elif obj.is_paid:
            return 'PAID (PENDING VERIFICATION)'
        return 'UNPAID'


class MaintenancePaymentSubmitSerializer(serializers.Serializer):
    """
    Serializer for submitting maintenance payment proof.
    POST /api/vendor/maintenance/<fee_id>/pay/
    
    Accepts multipart/form-data:
      - payment_mode: 'upi' or 'net_banking' (required)
      - upi_transaction_id: required if payment_mode='upi'
      - bank_reference_number: required if payment_mode='net_banking'
      - payment_screenshot: image file (required)
    """
    payment_mode = serializers.ChoiceField(
        choices=[('upi', 'UPI'), ('net_banking', 'Net Banking')],
        required=True
    )
    upi_transaction_id = serializers.CharField(
        max_length=120,
        required=False,
        allow_blank=True
    )
    bank_reference_number = serializers.CharField(
        max_length=120,
        required=False,
        allow_blank=True
    )
    payment_screenshot = serializers.ImageField(required=True)

    def validate(self, attrs):
        """Validate payment details based on payment mode."""
        payment_mode = attrs.get('payment_mode')
        upi_transaction_id = attrs.get('upi_transaction_id', '').strip()
        bank_reference_number = attrs.get('bank_reference_number', '').strip()
        payment_screenshot = attrs.get('payment_screenshot')

        if not payment_screenshot:
            raise serializers.ValidationError({
                'payment_screenshot': 'Payment screenshot is required.'
            })

        if payment_mode == 'upi':
            if not upi_transaction_id:
                raise serializers.ValidationError({
                    'upi_transaction_id': 'UPI transaction ID is required for UPI payments.'
                })
        elif payment_mode == 'net_banking':
            if not bank_reference_number:
                raise serializers.ValidationError({
                    'bank_reference_number': 'Bank reference number is required for net banking payments.'
                })

        return attrs
