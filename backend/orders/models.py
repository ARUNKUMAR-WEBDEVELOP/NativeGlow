from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


def generate_order_code():
    """Generate unique order code like NG-2025-00123"""
    from django.utils import timezone
    year = timezone.now().year
    # Get the next sequence number for this year
    count = Order.objects.filter(
        created_at__year=year
    ).count() + 1
    return f"NG-{year}-{count:05d}"


class Order(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('upi', 'UPI'),
        ('bank_transfer', 'Bank Transfer'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]

    order_id = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
    order_code = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        null=True,
        blank=True,
        help_text='Public order code for tracking (e.g. NG-2025-00123)'
    )
    vendor = models.ForeignKey(
        'vendors.Vendor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_records',
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
    )
    buyer = models.ForeignKey(
        'buyers.Buyer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
    )
    buyer_name = models.CharField(max_length=255, blank=True)
    buyer_phone = models.CharField(max_length=20, blank=True)
    buyer_address = models.TextField(blank=True)
    buyer_pincode = models.CharField(max_length=20, blank=True)
    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default='India')
    quantity = models.PositiveIntegerField(default=1)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHOD_CHOICES, default='upi'
    )
    order_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('confirmed', 'Confirmed'),
            ('shipped', 'Shipped'),
            ('delivered', 'Delivered'),
            ('cancelled', 'Cancelled'),
        ],
        default='pending',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    coupon_code = models.CharField(max_length=40, blank=True)
    payment_provider = models.CharField(max_length=50, blank=True, default='nativeglow_stub')
    payment_reference = models.CharField(max_length=120, blank=True)
    payment_status = models.CharField(max_length=20, default='pending')
    tracking_id = models.CharField(max_length=120, blank=True)
    courier_name = models.CharField(max_length=120, blank=True)
    tracking_info = models.CharField(max_length=255, blank=True)
    cancel_reason = models.TextField(blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    buyer_confirmed_delivery = models.BooleanField(default=False)
    buyer_confirmed_at = models.DateTimeField(null=True, blank=True)
    buyer_confirmation_note = models.TextField(blank=True)
    delivery_rating = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.buyer_name:
            self.buyer_name = self.full_name
        if not self.buyer_phone:
            self.buyer_phone = self.phone
        if not self.buyer_pincode:
            self.buyer_pincode = self.pincode
        if not self.buyer_address:
            self.buyer_address = ', '.join(
                part
                for part in [self.address_line1, self.address_line2, self.city, self.state]
                if part
            )
        if self.total_amount == 0 and self.total:
            self.total_amount = self.total
        if self.total == 0 and self.total_amount:
            self.total = self.total_amount
        if not self.status and self.order_status:
            self.status = self.order_status
        # Auto-generate order_code if not set
        if not self.order_code:
            # Ensure uniqueness by checking existing codes
            from django.utils import timezone
            year = timezone.now().year
            base_count = Order.objects.filter(created_at__year=year).count() + 1
            order_code = f"NG-{year}-{base_count:05d}"
            counter = 0
            while Order.objects.filter(order_code=order_code).exists():
                base_count += 1
                counter += 1
                order_code = f"NG-{year}-{base_count:05d}"
                if counter > 100:  # Safety check
                    raise ValueError("Unable to generate unique order code")
            self.order_code = order_code
        super().save(*args, **kwargs)

    def __str__(self):
        buyer = self.user.username if self.user else (self.buyer_name or 'Guest')
        return f'Order #{self.order_id} - {buyer}'


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.SET_NULL, null=True, blank=True)
    product_title = models.CharField(max_length=255)
    product_sku = models.CharField(max_length=100, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f'{self.product_title} x {self.quantity}'
