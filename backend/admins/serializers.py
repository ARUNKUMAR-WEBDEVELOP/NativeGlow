from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Sum, Q
from django.conf import settings
import requests as http_requests
from .models import AdminUser, MaintenanceFee, PlatformPaymentDetails
from vendors.models import Vendor
from products.models import Product, Category
from orders.models import Order


class AdminLoginSerializer(serializers.Serializer):
    """Serializer for admin login — validate email and password."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        """Validate admin credentials and enforce single-device session."""
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        device_id = self.context.get('device_id', '').strip()

        if not email or not password:
            raise serializers.ValidationError('Email and password are required.')

        try:
            admin_user = AdminUser.objects.get(email__iexact=email)
        except AdminUser.DoesNotExist:
            raise serializers.ValidationError('Invalid email or password.')

        if not admin_user.check_password(password):
            alt_password = password.replace('password-', '', 1) if password.startswith('password-') else f'password-{password}'
            if not admin_user.check_password(alt_password):
                raise serializers.ValidationError('Invalid email or password.')

        if admin_user.is_superadmin:
            if not device_id:
                raise serializers.ValidationError('Device ID is required for superadmin login.')
            # ── Single-device lock: if a session is already active on a different device, block login ──
            active_device = admin_user.active_device_id.strip()
            if active_device and active_device != device_id:
                raise serializers.ValidationError(
                    'DEVICE_LOCKED: This Super Admin account is already active on another device. '
                    'Only one device can access the Super Admin portal at a time. '
                    'Please log out from the other device first, or contact support.'
                )
            # Register this device as the sole active device
            admin_user.set_active_device(device_id)

        data['admin_user'] = admin_user
        return data
class AdminGoogleLoginSerializer(serializers.Serializer):
    """
    Verify a Google OAuth2 access_token for Super Admin login.

    Flow:
    1. Frontend gets an access_token via useGoogleLogin(flow='implicit').
    2. Frontend POSTs it here along with a device_id (from X-Device-ID header).
    3. We verify the token by calling Google's userinfo endpoint.
    4. We enforce the allowed domain, auto-create/fetch the AdminUser, and
       enforce single-device: the new device evicts any existing session.
    """
    google_token = serializers.CharField(write_only=True)

    def validate(self, data):
        google_token = data.get('google_token', '').strip()
        device_id = self.context.get('device_id', '').strip()

        if not google_token:
            raise serializers.ValidationError('Google token is required.')

        if not device_id:
            raise serializers.ValidationError('Device ID is required for superadmin login.')

        # ── 1. Verify token (supports both access_token and id_token) ────────
        idinfo = None
        # Try verifying as access_token via Google userinfo endpoint
        try:
            userinfo_res = http_requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {google_token}'},
                timeout=10,
            )
            if userinfo_res.status_code == 200:
                idinfo = userinfo_res.json()
        except http_requests.RequestException:
            pass

        # If userinfo failed, try verifying as id_token via Google tokeninfo endpoint
        if not idinfo:
            try:
                tokeninfo_res = http_requests.get(
                    f'https://oauth2.googleapis.com/tokeninfo?id_token={google_token}',
                    timeout=10,
                )
                if tokeninfo_res.status_code == 200:
                    idinfo = tokeninfo_res.json()
            except http_requests.RequestException:
                pass

        if not idinfo:
            raise serializers.ValidationError(
                'Invalid or expired Google token. Please sign in again.'
            )

        # ── 2. Enforce authorized domain restriction ───────────────────────────
        allowed_domain = getattr(settings, 'GOOGLE_ALLOWED_DOMAIN', '').strip()
        email: str = idinfo.get('email', '').lower().strip()
        email_verified: bool = idinfo.get('email_verified', False)

        if not email:
            raise serializers.ValidationError('Google account has no email address.')

        if not email_verified:
            raise serializers.ValidationError('Google account email is not verified.')

        if allowed_domain:
            hd_claim = idinfo.get('hd', '')
            email_domain = email.split('@')[-1]
            if hd_claim != allowed_domain and email_domain != allowed_domain:
                raise serializers.ValidationError(
                    'Access denied. Only accounts from the authorized organization may log in.'
                )

        # ── 3. Fetch pre-registered AdminUser ─────────────────────────────────
        google_id: str = idinfo.get('sub', '')
        full_name: str = idinfo.get('name', email.split('@')[0])

        admin_user = None
        try:
            admin_user = AdminUser.objects.get(google_id=google_id)
        except AdminUser.DoesNotExist:
            pass

        if admin_user is None:
            try:
                # Account pre-registered in DB by email — link Google ID
                admin_user = AdminUser.objects.get(email__iexact=email)
                update_fields = []
                if not admin_user.google_id:
                    admin_user.google_id = google_id
                    update_fields.append('google_id')
                if admin_user.auth_provider != 'google':
                    admin_user.auth_provider = 'google'
                    update_fields.append('auth_provider')
                if update_fields:
                    admin_user.save(update_fields=update_fields)
            except AdminUser.DoesNotExist:
                # Strictly reject accounts not pre-registered in the DB
                raise serializers.ValidationError(
                    f"Access denied. Google account '{email}' is not pre-registered in the database as a Super Admin."
                )

        if not admin_user.is_superadmin:
            raise serializers.ValidationError(
                'Access denied. This account does not have Super Admin privileges.'
            )

        # ── 4. Single-device lock: block login from a second device ────────────
        active_device = admin_user.active_device_id.strip()
        if active_device and active_device != device_id:
            raise serializers.ValidationError(
                'DEVICE_LOCKED: This Super Admin account is already active on another device. '
                'Only one device can access the Super Admin portal at a time. '
                'Please log out from the other device first, or contact support.'
            )
        admin_user.set_active_device(device_id)

        data['admin_user'] = admin_user
        data['device_id'] = device_id
        return data


class AdminProfileSerializer(serializers.ModelSerializer):
    """Serializer for admin profile response."""

    class Meta:
        model = AdminUser
        fields = ('id', 'full_name', 'email', 'is_superadmin', 'auth_provider', 'created_at')
        read_only_fields = ('id', 'created_at')


# ============================================================================
# ADMIN VENDOR MONITORING SERIALIZERS
# ============================================================================

class AdminVendorListSerializer(serializers.ModelSerializer):
    """Serializer for listing vendors with calculated fields (total products, orders, revenue)."""
    total_products = serializers.SerializerMethodField()
    total_orders = serializers.SerializerMethodField()
    this_month_revenue = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = (
            'id', 'full_name', 'business_name', 'email', 'city',
            'whatsapp_number', 'is_approved', 'is_active',
            'registered_via_google', 'google_email_verified', 'google_id',
            'maintenance_due', 'created_at',
            'total_products', 'total_orders', 'this_month_revenue', 'status'
        )
        read_only_fields = fields

    def get_total_products(self, obj):
        """Count total products for this vendor."""
        return Product.objects.filter(vendor=obj).count()

    def get_total_orders(self, obj):
        """Count total orders for this vendor."""
        return Order.objects.filter(vendor=obj).count()

    def get_this_month_revenue(self, obj):
        """Sum revenue from delivered orders this month."""
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)

        revenue = Order.objects.filter(
            vendor=obj,
            status='delivered',
            created_at__gte=month_start,
            created_at__lte=month_end
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        return float(revenue)

    def get_status(self, obj):
        """Return vendor status: pending, approved, or inactive."""
        if not obj.is_active:
            return 'inactive'
        if not obj.is_approved:
            return 'pending'
        return 'approved'


class AdminVendorDetailSerializer(serializers.ModelSerializer):
    """Serializer for full vendor profile with products and recent orders."""
    total_products = serializers.SerializerMethodField()
    total_orders = serializers.SerializerMethodField()
    this_month_revenue = serializers.SerializerMethodField()
    all_time_revenue = serializers.SerializerMethodField()
    products = serializers.SerializerMethodField()
    recent_orders = serializers.SerializerMethodField()
    avg_order_value = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = (
            'id', 'full_name', 'business_name', 'email', 'city',
            'whatsapp_number', 'upi_id', 'bank_account_number', 'bank_ifsc', 'account_holder_name',
            'registered_via_google', 'google_email_verified', 'google_id',
            'is_approved', 'is_active', 'maintenance_due',
            'created_at', 'updated_at',
            'total_products', 'total_orders', 'this_month_revenue', 'all_time_revenue',
            'avg_order_value', 'status',
            'products', 'recent_orders'
        )
        read_only_fields = fields

    def get_total_products(self, obj):
        return Product.objects.filter(vendor=obj).count()

    def get_total_orders(self, obj):
        return Order.objects.filter(vendor=obj).count()

    def get_this_month_revenue(self, obj):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)

        revenue = Order.objects.filter(
            vendor=obj,
            status='delivered',
            created_at__gte=month_start,
            created_at__lte=month_end
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        return float(revenue)

    def get_all_time_revenue(self, obj):
        """Sum revenue from all delivered orders."""
        revenue = Order.objects.filter(
            vendor=obj,
            status='delivered'
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        return float(revenue)

    def get_avg_order_value(self, obj):
        """Calculate average order value for this vendor."""
        orders = Order.objects.filter(vendor=obj)
        if not orders.exists():
            return 0.0
        total = orders.aggregate(total=Sum('total_amount'))['total'] or 0
        return float(total) / orders.count()

    def get_products(self, obj):
        """Return list of vendor's products."""
        products = Product.objects.filter(vendor=obj).values(
            'id', 'name', 'price', 'status', 'is_active', 'available_quantity', 'created_at'
        )
        return list(products)

    def get_recent_orders(self, obj):
        """Return last 10 orders for this vendor."""
        orders = Order.objects.filter(vendor=obj).order_by('-created_at')[:10]
        return [
            {
                'id': order.id,
                'order_id': str(order.order_id),
                'buyer_name': order.buyer_name,
                'quantity': order.quantity,
                'total_amount': float(order.total_amount),
                'status': order.status,
                'created_at': order.created_at.isoformat()
            }
            for order in orders
        ]

    def get_status(self, obj):
        if not obj.is_active:
            return 'inactive'
        if not obj.is_approved:
            return 'pending'
        return 'approved'


class AdminVendorApprovalSerializer(serializers.Serializer):
    """Serializer for approval/rejection actions."""
    approved = serializers.BooleanField()
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate(self, data):
        if not data.get('approved') and not data.get('reason'):
            raise serializers.ValidationError('Reason is required for rejection.')
        return data


class AdminVendorDeactivateSerializer(serializers.Serializer):
    """Serializer for vendor deactivation."""
    reason = serializers.CharField(max_length=500)


class AdminVendorMaintenanceSerializer(serializers.Serializer):
    """Serializer for maintenance fee status."""
    paid = serializers.BooleanField()
    month = serializers.CharField(max_length=7, help_text='Format: YYYY-MM')  # e.g., "2025-03"


# ============================================================================
# MAINTENANCE FEE SERIALIZERS
# ============================================================================

class MaintenanceFeeListSerializer(serializers.ModelSerializer):
    """Serializer for listing maintenance fees."""
    vendor_name = serializers.CharField(source='vendor.business_name', read_only=True)
    vendor_email = serializers.CharField(source='vendor.email', read_only=True)

    class Meta:
        model = MaintenanceFee
        fields = (
            'id', 'vendor', 'vendor_name', 'vendor_email',
            'month', 'amount', 'is_paid', 'paid_on',
            'payment_reference', 'created_at'
        )
        read_only_fields = fields


class MaintenanceFeeDetailSerializer(serializers.ModelSerializer):
    """Serializer for maintenance fee details."""
    vendor_name = serializers.CharField(source='vendor.business_name', read_only=True)
    vendor_email = serializers.CharField(source='vendor.email', read_only=True)

    class Meta:
        model = MaintenanceFee
        fields = (
            'id', 'vendor', 'vendor_name', 'vendor_email',
            'month', 'amount', 'is_paid', 'paid_on',
            'payment_reference', 'notes', 'created_at'
        )
        read_only_fields = ('id', 'vendor', 'month', 'amount', 'created_at')


class MaintenanceFeeGenerateSerializer(serializers.Serializer):
    """Serializer for generating maintenance fees for all vendors."""
    month = serializers.CharField(max_length=7, help_text='Format: YYYY-MM (e.g., 2025-03)')
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)

    def validate_month(self, value):
        """Validate month format YYYY-MM."""
        try:
            parts = value.split('-')
            if len(parts) != 2:
                raise ValueError
            year = int(parts[0])
            month = int(parts[1])
            if not (1 <= month <= 12):
                raise ValueError
        except (ValueError, IndexError):
            raise serializers.ValidationError('Month must be in format YYYY-MM (e.g., 2025-03)')
        return value

    def validate_amount(self, value):
        """Validate amount is positive."""
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than 0.')
        return value


class MaintenanceFeeMarkPaidSerializer(serializers.Serializer):
    """Serializer for marking maintenance fee as paid."""
    payment_reference = serializers.CharField(max_length=120, required=True)
    paid_on = serializers.DateField(required=True)


class MaintenanceFeeSummarySerializer(serializers.Serializer):
    """Serializer for maintenance fee summary response."""
    month = serializers.CharField()
    total_vendors = serializers.IntegerField()
    total_expected = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_collected = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_pending = serializers.DecimalField(max_digits=15, decimal_places=2)
    collection_rate = serializers.FloatField()  # Percentage 0-100


# ============================================================================
# MAINTENANCE PAYMENT VERIFICATION SERIALIZERS
# ============================================================================

class MaintenancePendingVerificationSerializer(serializers.Serializer):
    """
    Serializer for listing maintenance payments pending admin verification.
    GET /api/admin/maintenance/pending-verification/
    """
    id = serializers.IntegerField()
    vendor_id = serializers.IntegerField()
    vendor_name = serializers.CharField()
    vendor_email = serializers.CharField()
    vendor_phone = serializers.CharField()
    month = serializers.CharField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_mode = serializers.CharField()
    transaction_id = serializers.SerializerMethodField()
    payment_screenshot_url = serializers.SerializerMethodField()
    submitted_at = serializers.DateTimeField()

    def get_transaction_id(self, obj):
        """Return appropriate transaction ID based on payment mode."""
        if obj.payment_mode == 'upi':
            return obj.upi_transaction_id or ''
        elif obj.payment_mode == 'net_banking':
            return obj.bank_reference_number or ''
        return ''

    def get_payment_screenshot_url(self, obj):
        """Return full URL to payment screenshot if available."""
        if obj.payment_screenshot:
            request = self.context.get('request')
            if request and hasattr(obj.payment_screenshot, 'url'):
                return request.build_absolute_uri(obj.payment_screenshot.url)
            return obj.payment_screenshot.url if hasattr(obj.payment_screenshot, 'url') else str(obj.payment_screenshot)
        return None


class MaintenancePaymentVerifySerializer(serializers.Serializer):
    """
    Serializer for admin verification/rejection of maintenance payment.
    PATCH /api/admin/maintenance/<fee_id>/verify/
    """
    verified = serializers.BooleanField(required=True)
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        help_text='Rejection reason if verified=False'
    )

    def validate(self, attrs):
        """Validate that note is provided if verified=False."""
        verified = attrs.get('verified')
        note = attrs.get('note', '').strip()

        if not verified and not note:
            raise serializers.ValidationError({
                'note': 'Rejection reason is required when rejecting payment.'
            })

        return attrs


# ============================================================================
# PRODUCT APPROVAL SERIALIZERS
# ============================================================================

class AdminProductListSerializer(serializers.ModelSerializer):
    """Serializer for listing products with filtering."""
    vendor_name = serializers.CharField(source='vendor.business_name', read_only=True, allow_null=True)
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    approval_status = serializers.CharField(source='status', read_only=True)
    is_available = serializers.CharField(source='is_active', read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'vendor', 'vendor_name', 'title', 'category', 'category_name',
            'price', 'status', 'approval_status', 'is_active', 'is_available',
            'is_natural_certified', 'created_at'
        )
        read_only_fields = fields

    def to_representation(self, instance):
        """Override to include created_at."""
        ret = super().to_representation(instance)
        # Add created_at if available via model
        if hasattr(instance, 'created_at'):
            ret['created_at'] = instance.created_at.isoformat()
        else:
            # Fallback to id creation time if created_at not in model
            ret['created_at'] = timezone.now().isoformat()
        return ret


class AdminProductDetailSerializer(serializers.ModelSerializer):
    """Serializer for product details including images and more info."""
    vendor_name = serializers.CharField(source='vendor.business_name', read_only=True, allow_null=True)
    vendor_email = serializers.CharField(source='vendor.email', read_only=True, allow_null=True)
    vendor_whatsapp = serializers.CharField(source='vendor.whatsapp_number', read_only=True, allow_null=True)
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    approval_status = serializers.CharField(source='status', read_only=True)
    rejection_reason = serializers.CharField(source='admin_rejection_reason', read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'vendor', 'vendor_name', 'vendor_email', 'vendor_whatsapp',
            'title', 'name', 'slug', 'description', 'short_description',
            'ingredients', 'category', 'category_name', 'category_type',
            'price', 'discount_price', 'available_quantity',
            'is_natural_certified', 'is_active',
            'status', 'approval_status', 'admin_rejection_reason', 'rejection_reason',
            'image', 'created_at', 'updated_at'
        )
        read_only_fields = fields


class AdminProductApprovalSerializer(serializers.Serializer):
    """Serializer for product approval/rejection."""
    status = serializers.ChoiceField(choices=['approved', 'rejected'])
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate(self, data):
        """Require reason for rejection."""
        status = data.get('status')
        reason = data.get('reason', '').strip()

        if status == 'rejected' and not reason:
            raise serializers.ValidationError('Rejection reason is required when rejecting a product.')

        return data


# ============================================================================
# ADMIN ORDER & SALES MONITORING SERIALIZERS (READ-ONLY)
# ============================================================================

class AdminOrderListSerializer(serializers.Serializer):
    """Serializer for listing all orders across all vendors with filtering."""
    id = serializers.IntegerField()
    order_id = serializers.CharField()
    buyer_name = serializers.CharField()
    product_name = serializers.CharField()
    vendor_name = serializers.CharField()
    vendor_id = serializers.IntegerField()
    quantity = serializers.IntegerField()


# ============================================================================
# PLATFORM PAYMENT DETAILS SERIALIZER (PUBLIC)
# ============================================================================

class PlatformPaymentDetailsSerializer(serializers.ModelSerializer):
    """
    Serializer for platform payment details.
    Public API: returns only the active payment details for vendors to know where to pay.
    """

    class Meta:
        model = PlatformPaymentDetails
        fields = (
            'upi_id',
            'upi_name',
            'bank_account_number',
            'bank_ifsc',
            'bank_name',
            'account_holder_name',
        )
        read_only_fields = fields


class AdminOrderDetailSerializer(serializers.Serializer):
    """Serializer for full admin read-only order detail modal."""
    id = serializers.IntegerField()
    order_id = serializers.CharField()
    status = serializers.CharField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()

    buyer_name = serializers.CharField(allow_blank=True)
    buyer_phone = serializers.CharField(allow_blank=True)
    buyer_address = serializers.CharField(allow_blank=True)
    buyer_pincode = serializers.CharField(allow_blank=True)
    full_name = serializers.CharField(allow_blank=True)
    email = serializers.CharField(allow_blank=True)
    phone = serializers.CharField(allow_blank=True)
    address_line1 = serializers.CharField(allow_blank=True)
    address_line2 = serializers.CharField(allow_blank=True)
    city = serializers.CharField(allow_blank=True)
    state = serializers.CharField(allow_blank=True)
    pincode = serializers.CharField(allow_blank=True)
    country = serializers.CharField(allow_blank=True)

    vendor = serializers.DictField()
    items = serializers.ListField()

    quantity = serializers.IntegerField()
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    shipping_fee = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_total = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)

    payment_method = serializers.CharField(allow_blank=True)
    payment_status = serializers.CharField(allow_blank=True)
    payment_reference = serializers.CharField(allow_blank=True)

    timeline = serializers.ListField()


class MonthlySalesSerializer(serializers.Serializer):
    """Serializer for monthly sales summary across all vendors."""
    month = serializers.CharField()
    total_orders = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    top_vendor = serializers.CharField(allow_null=True)
    top_product = serializers.CharField(allow_null=True)
    top_vendor_revenue = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    top_product_revenue = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)


class VendorMonthlySalesSerializer(serializers.Serializer):
    """Serializer for vendor-specific monthly sales breakdown."""
    month = serializers.CharField()
    vendor_id = serializers.IntegerField()
    vendor_name = serializers.CharField()
    orders_count = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    avg_order_value = serializers.DecimalField(max_digits=10, decimal_places=2)


class AdminDashboardStatsSerializer(serializers.Serializer):
    """Serializer for admin dashboard overview statistics."""
    # Vendor metrics
    total_vendors = serializers.IntegerField()
    active_vendors = serializers.IntegerField()
    pending_vendor_approvals = serializers.IntegerField()

    # Product metrics
    total_products = serializers.IntegerField()
    pending_product_approvals = serializers.IntegerField()
    active_products = serializers.IntegerField()

    # Order metrics (this month)
    total_orders_this_month = serializers.IntegerField()
    revenue_this_month = serializers.DecimalField(max_digits=12, decimal_places=2)

    # Maintenance fee metrics (this month)
    maintenance_collected_this_month = serializers.DecimalField(max_digits=12, decimal_places=2)
    maintenance_pending_count = serializers.IntegerField()
    maintenance_pending_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
