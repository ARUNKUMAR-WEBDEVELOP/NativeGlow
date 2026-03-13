from django.db import models
from django.conf import settings


APPLICATION_STATUS = [
    ('pending', 'Pending'),
    ('approved', 'Approved'),
    ('rejected', 'Rejected'),
]


class Vendor(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vendor_profile'
    )
    brand_name = models.CharField(max_length=150)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    product_types = models.CharField(
        max_length=300, help_text='Types of natural products you sell'
    )
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    logo = models.ImageField(upload_to='vendors/', blank=True, null=True)
    is_natural_certified = models.BooleanField(
        default=False,
        help_text='Vendor confirms products are natural and chemical-free',
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending Review'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
            ('suspended', 'Suspended'),
        ],
        default='pending',
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    total_sales = models.PositiveIntegerField(default=0)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=12.00)
    payout_terms = models.CharField(max_length=200, default='Monthly settlement after service commission.')
    website = models.URLField(blank=True)
    contact_email = models.EmailField(blank=True)

    class Meta:
        ordering = ['-joined_at']

    def __str__(self):
        return self.brand_name


class VendorApplication(models.Model):
    """
    Submitted by natural product sellers who want to collaborate with NativeGlow.
    Admin reviews and approves or rejects applications.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vendor_applications',
    )
    brand_name = models.CharField(max_length=255)
    product_types = models.TextField(
        help_text='Describe the types of natural products you sell (e.g. herbal oils, bath powders, cotton wear).'
    )
    why_collaborate = models.TextField(
        help_text='Why do you want to partner with NativeGlow?'
    )
    current_sales_channels = models.TextField(
        blank=True,
        help_text='Where do you currently sell? (e.g. local market, Instagram, own website)'
    )
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20, blank=True)
    status = models.CharField(
        max_length=20, choices=APPLICATION_STATUS, default='pending'
    )
    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.brand_name} ({self.get_status_display()})"
