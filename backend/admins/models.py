from django.contrib.auth.hashers import check_password, make_password
from django.db import models


class AdminUserManager(models.Manager):
    def create_superadmin_account(self, full_name, email, password):
        admin_user = self.model(
            full_name=full_name,
            email=email,
            password=make_password(password),
            is_superadmin=True,
        )
        admin_user.save(using=self._db)
        return admin_user

    def create_admin_account(self, creator, full_name, email, password, is_superadmin=False):
        if not creator or not getattr(creator, 'is_superadmin', False):
            raise PermissionError('Only a superadmin can create new admin accounts.')

        admin_user = self.model(
            full_name=full_name,
            email=email,
            password=make_password(password),
            is_superadmin=is_superadmin,
        )
        admin_user.save(using=self._db)
        return admin_user


class AdminUser(models.Model):
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    is_superadmin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = AdminUserManager()

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self.password and not self.password.startswith('pbkdf2_'):
            self.password = make_password(self.password)
        super().save(*args, **kwargs)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    def __str__(self):
        return f"{self.full_name} ({self.email})"


class MaintenanceFee(models.Model):
    """
    Monthly maintenance/subscription fee tracking for vendors.
    Admin generates fees for all active vendors each month.
    """
    vendor = models.ForeignKey(
        'vendors.Vendor',
        on_delete=models.CASCADE,
        related_name='maintenance_fees'
    )
    month = models.CharField(
        max_length=7,
        db_index=True,
        help_text='Format: YYYY-MM (e.g., 2025-03)'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=500,
        help_text='Monthly platform fee'
    )
    is_paid = models.BooleanField(default=False, db_index=True)
    paid_on = models.DateField(null=True, blank=True)
    payment_reference = models.CharField(
        max_length=120,
        blank=True,
        help_text='Vendor transaction ID / UTR'
    )
    payment_mode = models.CharField(
        max_length=20,
        choices=[('upi', 'UPI'), ('net_banking', 'Net Banking')],
        blank=True,
        default=''
    )
    upi_transaction_id = models.CharField(max_length=120, blank=True, default='')
    bank_reference_number = models.CharField(max_length=120, blank=True, default='')
    payment_screenshot = models.ImageField(upload_to='maintenance_proofs/', null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    verified_by_admin = models.BooleanField(default=False)
    verification_note = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-month', '-created_at']
        unique_together = ('vendor', 'month')
        indexes = [
            models.Index(fields=['month', 'is_paid']),
            models.Index(fields=['vendor', 'is_paid']),
        ]

    def __str__(self):
        status = 'PAID' if self.is_paid else 'PENDING'
        return f"{self.vendor.business_name} - {self.month} [{status}]"


class PlatformPaymentDetails(models.Model):
    """
    Stores NativeGlow's payment details (UPI and Bank)
    that vendors use to pay maintenance fees.
    Only one active record should exist at a time.
    Admin updates this from Django admin panel.
    """
    upi_id = models.CharField(max_length=120, help_text='e.g., nativeglow@upi')
    upi_name = models.CharField(max_length=255, help_text='e.g., NativeGlow Platform')
    bank_account_number = models.CharField(max_length=60)
    bank_ifsc = models.CharField(max_length=20)
    bank_name = models.CharField(max_length=255)
    account_holder_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True, help_text='Only one record should be active')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Platform Payment Details'
        ordering = ['-updated_at']

    def save(self, *args, **kwargs):
        """Ensure only one active record exists"""
        if self.is_active:
            PlatformPaymentDetails.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

    def __str__(self):
        status = 'ACTIVE' if self.is_active else 'INACTIVE'
        return f"NativeGlow Payment Details [{status}]"
