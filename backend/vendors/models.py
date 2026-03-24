from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.utils.text import slugify
from django.utils import timezone


class Vendor(models.Model):
    """
    Vendor account model with standalone authentication.
    Direct vendor login without relying on Django User model.
    """
    # Authentication
    full_name = models.CharField(max_length=255, default='')
    email = models.EmailField(unique=True, db_index=True, null=True, blank=True)
    password = models.CharField(max_length=255, default='')  # Hashed password

    # Business Details
    business_name = models.CharField(max_length=255, default='')
    vendor_slug = models.SlugField(unique=True, help_text='Used for product page URL', null=True, blank=True)
    city = models.CharField(max_length=100, default='')
    whatsapp_number = models.CharField(max_length=20, default='')
    product_category = models.JSONField(default=list, blank=True)
    natural_only_confirmed = models.BooleanField(default=False)
    terms_accepted = models.BooleanField(default=False)

    # Payment & Banking
    upi_id = models.CharField(max_length=100, blank=True)
    bank_account_number = models.CharField(max_length=50, blank=True)
    bank_ifsc = models.CharField(max_length=20, blank=True)
    account_holder_name = models.CharField(max_length=255, blank=True)

    # Status & Approval
    is_approved = models.BooleanField(default=False, help_text='Admin approval required')
    is_active = models.BooleanField(default=True)
    maintenance_due = models.BooleanField(default=False, help_text='Monthly maintenance fee pending')

    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def _build_unique_vendor_slug(self):
        """Generate a unique slug from business name, appending numeric suffix if needed."""
        base = slugify(self.business_name or 'vendor') or 'vendor'
        candidate = base
        suffix = 1
        while Vendor.objects.filter(vendor_slug=candidate).exclude(pk=self.pk).exists():
            suffix += 1
            candidate = f"{base}-{suffix}"
        return candidate

    def save(self, *args, **kwargs):
        # Auto-hash password if it's not already hashed
        if self.password and not self.password.startswith('pbkdf2_'):
            self.password = make_password(self.password)
        # Auto-generate vendor_slug from business_name with collision-safe suffixing
        if not self.vendor_slug:
            self.vendor_slug = self._build_unique_vendor_slug()
        super().save(*args, **kwargs)

    def check_password(self, raw_password):
        """Check if provided password matches stored hashed password"""
        return check_password(raw_password, self.password)

    def __str__(self):
        return f"{self.business_name} ({self.email})"


class MaintenancePayment(models.Model):
    vendor = models.ForeignKey(
        Vendor, on_delete=models.CASCADE, related_name='maintenance_payments'
    )
    month = models.PositiveSmallIntegerField()
    year = models.PositiveIntegerField()
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField(null=True, blank=True)
    payment_reference = models.CharField(max_length=120, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('paid', 'Paid'),
            ('pending', 'Pending'),
            ('overdue', 'Overdue'),
        ],
        default='pending',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-year', '-month']
        unique_together = ('vendor', 'month', 'year')

    def __str__(self):
        return f"{self.vendor} - {self.month}/{self.year} ({self.status})"


class VendorApplication(models.Model):
    """
    Submitted by vendors who want to join NativeGlow.
    Admin reviews and approves or rejects applications.
    """
    APPLICATION_STATUS = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    full_name = models.CharField(max_length=255, default='')
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=20, default='')
    business_name = models.CharField(max_length=255, default='')
    product_types = models.TextField(
        help_text='Describe the types of natural products you sell', default=''
    )
    why_collaborate = models.TextField(
        help_text='Why do you want to partner with NativeGlow?', default=''
    )
    current_sales_channels = models.TextField(
        blank=True,
        help_text='Where do you currently sell? (e.g. local market, Instagram, own website)'
    )
    status = models.CharField(
        max_length=20, choices=APPLICATION_STATUS, default='pending'
    )
    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.business_name} ({self.get_status_display()})"
