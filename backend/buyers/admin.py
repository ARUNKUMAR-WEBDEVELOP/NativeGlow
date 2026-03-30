from django.contrib import admin
from .models import Buyer


@admin.register(Buyer)
class BuyerAdmin(admin.ModelAdmin):
	list_display = ('full_name', 'email', 'vendor', 'is_active', 'last_login', 'created_at')
	search_fields = ('full_name', 'email', 'vendor__business_name', 'vendor__vendor_slug')
	list_filter = ('is_active', 'vendor', 'created_at')
