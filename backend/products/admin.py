from django.contrib import admin
from .models import Category, Product, ProductImage, ProductVariant


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'category', 'vendor', 'price',
        'inventory_qty', 'is_active', 'is_bestseller', 'is_featured',
    )
    list_filter = ('category', 'is_active', 'is_bestseller', 'is_new_arrival', 'is_featured')
    search_fields = ('title', 'sku', 'tags')
    prepopulated_fields = {'slug': ('title',)}
    inlines = (ProductImageInline, ProductVariantInline)
    fieldsets = (
        ('Basic Info', {
            'fields': ('title', 'slug', 'category', 'vendor', 'sku'),
        }),
        ('Description', {
            'fields': ('description', 'short_description', 'ingredients'),
        }),
        ('Pricing & Stock', {
            'fields': ('price', 'compare_price', 'inventory_qty'),
        }),
        ('Status & Tags', {
            'fields': (
                'status', 'is_active', 'is_bestseller', 'is_new_arrival',
                'is_featured', 'tags', 'shipping_info',
            ),
        }),
        ('SEO', {
            'fields': ('seo_title', 'seo_description'),
        }),
    )
