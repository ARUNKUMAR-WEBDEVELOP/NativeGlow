from django.contrib import admin
from .models import Vendor, VendorApplication


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('brand_name', 'city', 'state', 'status', 'commission_rate', 'joined_at')
    list_filter = ('status', 'is_natural_certified')
    search_fields = ('brand_name', 'contact_email')


@admin.register(VendorApplication)
class VendorApplicationAdmin(admin.ModelAdmin):
    list_display = ('brand_name', 'contact_email', 'status', 'applied_at', 'reviewed_at')
    list_filter = ('status',)
    search_fields = ('brand_name', 'contact_email')
    readonly_fields = ('applied_at',)
    fieldsets = (
        ('Applicant', {
            'fields': ('user', 'brand_name', 'contact_email', 'contact_phone'),
        }),
        ('Application Details', {
            'fields': ('product_types', 'why_collaborate', 'current_sales_channels'),
        }),
        ('Review', {
            'fields': ('status', 'admin_notes', 'reviewed_at'),
        }),
        ('Timestamps', {
            'fields': ('applied_at',),
        }),
    )
