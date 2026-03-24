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


# ============================================================================
# VENDOR AUTHENTICATION SERIALIZERS
# ============================================================================

class VendorRegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for vendor registration.
    POST /api/vendor/register/
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        help_text='Password must be at least 8 characters'
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8
    )

    class Meta:
        model = Vendor
        fields = (
            'full_name', 'email', 'password', 'confirm_password',
            'business_name', 'whatsapp_number', 'city',
            'product_category', 'natural_only_confirmed', 'terms_accepted',
            'upi_id', 'bank_account_number', 'bank_ifsc', 'account_holder_name'
        )

    def validate(self, attrs):
        """Validate password confirmation and email uniqueness."""
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })

        password = attrs.pop('confirm_password')  # Remove confirm_password from validated data
        
        if Vendor.objects.filter(email__iexact=attrs.get('email')).exists():
            raise serializers.ValidationError({
                'email': 'A vendor with this email already exists.'
            })

        return attrs

    def create(self, validated_data):
        """Create vendor with hashed password and auto-generated slug."""
        from django.contrib.auth.hashers import make_password

        # Hash the password
        password = validated_data.pop('password')
        validated_data['password'] = make_password(password)

        vendor = Vendor.objects.create(**validated_data)
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
