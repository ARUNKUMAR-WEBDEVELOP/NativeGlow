from django.db import models
from django.utils import timezone

from vendors.models import Vendor


class Buyer(models.Model):
	"""Buyer account scoped to a specific vendor storefront."""

	vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='buyers')
	full_name = models.CharField(max_length=255, default='')
	email = models.EmailField(db_index=True)
	google_id = models.CharField(max_length=255)
	profile_picture = models.CharField(max_length=500, blank=True)
	phone = models.CharField(max_length=20, blank=True)
	default_address = models.TextField(blank=True)
	default_pincode = models.CharField(max_length=20, blank=True)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	last_login = models.DateTimeField(default=timezone.now)

	class Meta:
		ordering = ['-last_login']
		constraints = [
			models.UniqueConstraint(fields=['email', 'vendor'], name='unique_buyer_email_per_vendor'),
			models.UniqueConstraint(fields=['google_id', 'vendor'], name='unique_buyer_google_per_vendor'),
		]

	def __str__(self):
		return f"{self.full_name or self.email} @ {self.vendor.business_name}"
