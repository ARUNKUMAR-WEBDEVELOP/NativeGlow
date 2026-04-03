from django.contrib import admin
from .models import Vendor, VendorApplication, MaintenancePayment


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = (
        'business_name',
        'email',
        'city',
        'registered_via_google',
        'google_email_verified',
        'is_approved',
        'is_active',
        'maintenance_due',
        'created_at',
    )
    list_filter = ('registered_via_google', 'google_email_verified', 'is_approved', 'is_active', 'maintenance_due', 'created_at')
    search_fields = ('business_name', 'email', 'full_name')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Authentication', {
            'fields': ('full_name', 'email', 'password', 'google_id', 'registered_via_google', 'google_email_verified'),
        }),
        ('Business Details', {
            'fields': ('business_name', 'vendor_slug', 'city', 'whatsapp_number'),
        }),
        ('Banking & Payment', {
            'fields': ('upi_id', 'bank_account_number', 'bank_ifsc', 'account_holder_name'),
        }),
        ('Status & Approval', {
            'fields': ('is_approved', 'is_active', 'maintenance_due'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(MaintenancePayment)
class MaintenancePaymentAdmin(admin.ModelAdmin):
    list_display = ('vendor', 'month', 'year', 'amount_paid', 'status', 'payment_date')
    list_filter = ('status', 'year', 'month')
    search_fields = ('vendor__business_name',)
    readonly_fields = ('created_at',)


@admin.register(VendorApplication)
class VendorApplicationAdmin(admin.ModelAdmin):
    list_display = ('business_name', 'email', 'status', 'applied_at', 'reviewed_at')
    list_filter = ('status', 'applied_at')
    search_fields = ('business_name', 'email', 'full_name')
    readonly_fields = ('applied_at',)
    
    fieldsets = (
        ('Applicant Details', {
            'fields': ('full_name', 'email', 'phone', 'business_name'),
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
