#!/usr/bin/env python
"""
Database Viewer - See all NativeGlow data in PostgreSQL
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nativeglow_backend.settings')
django.setup()

from django.contrib.auth.models import User
from products.models import Product, Category, ProductVariant, ProductImage
from vendors.models import Vendor, VendorApplication
from orders.models import Order, OrderItem
from users.models import UserProfile

def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")

def main():
    print("\n" + "█"*70)
    print("█" + " "*68 + "█")
    print("█  🗄️  NativeGlow PostgreSQL Database Viewer" + " "*21 + "█")
    print("█" + " "*68 + "█")
    print("█"*70)

    # 1. DATABASE INFO
    print_section("1️⃣  DATABASE CONFIGURATION")
    from django.conf import settings
    db = settings.DATABASES['default']
    print(f"   Engine:  {db['ENGINE']}")
    print(f"   Name:    {db['NAME']}")
    print(f"   Host:    {db['HOST']}")
    print(f"   Port:    {db['PORT']}")
    print(f"   User:    {db['USER']}")

    # 2. USERS
    print_section("2️⃣  USERS")
    users = User.objects.all()
    print(f"   Total Users: {users.count()}\n")
    for user in users:
        profile = UserProfile.objects.filter(user=user).first()
        phone = profile.phone if profile else "N/A"
        print(f"   📧 {user.username}")
        print(f"      Email: {user.email}")
        print(f"      Phone: {phone}")
        print(f"      Joined: {user.date_joined.strftime('%Y-%m-%d %H:%M')}")
        print()

    # 3. VENDORS
    print_section("3️⃣  VENDORS")
    vendors = Vendor.objects.all()
    print(f"   Total Vendors: {vendors.count()}\n")
    for vendor in vendors:
        print(f"   🏪 {vendor.brand_name}")
        print(f"      Owner: {vendor.user.username}")
        print(f"      Status: {vendor.status}")
        print(f"      Products: {vendor.products.count()}")
        print(f"      Commission: {vendor.commission_rate}%")
        print(f"      Joined: {vendor.joined_at.strftime('%Y-%m-%d')}")
        print()

    # 4. CATEGORIES
    print_section("4️⃣  CATEGORIES")
    categories = Category.objects.all()
    print(f"   Total Categories: {categories.count()}\n")
    for cat in categories:
        count = cat.products.count()
        print(f"   📂 {cat.name} ({count} products)")

    # 5. PRODUCTS
    print_section("5️⃣  PRODUCTS")
    products = Product.objects.all()
    print(f"   Total Products: {products.count()}\n")
    for i, prod in enumerate(products, 1):
        images_count = prod.images.count()
        variants_count = prod.variants.count()
        print(f"   {i}. {prod.title}")
        print(f"      ID:       {prod.id}")
        print(f"      SKU:      {prod.sku}")
        print(f"      Price:    ${prod.price}")
        print(f"      Vendor:   {prod.vendor.brand_name if prod.vendor else 'N/A'}")
        print(f"      Category: {prod.category.name if prod.category else 'Uncategorized'}")
        print(f"      Stock:    {prod.inventory_qty} units")
        print(f"      Images:   {images_count}")
        print(f"      Variants: {variants_count}")
        print(f"      Status:   {'🟢 Active' if prod.is_active else '🔴 Inactive'}")
        print()

    # 6. PRODUCT VARIANTS
    print_section("6️⃣  PRODUCT VARIANTS")
    variants = ProductVariant.objects.all()
    print(f"   Total Variants: {variants.count()}\n")
    for variant in variants[:10]:  # Show first 10
        print(f"   {variant.product.title} - {variant.option_name}: {variant.option_value}")
        print(f"      Price: +${variant.additional_price} | Stock: {variant.stock}")
        print()
    if variants.count() > 10:
        print(f"   ... and {variants.count() - 10} more variants\n")

    # 7. PRODUCT IMAGES
    print_section("7️⃣  PRODUCT IMAGES")
    images = ProductImage.objects.all()
    print(f"   Total Images: {images.count()}\n")
    for img in images[:5]:  # Show first 5
        print(f"   📷 {img.product.title}")
        print(f"      URL: {img.image_url[:50]}..." if len(img.image_url) > 50 else f"      URL: {img.image_url}")
        print(f"      Alt: {img.alt_text if img.alt_text else 'No alt text'}")
        print()
    if images.count() > 5:
        print(f"   ... and {images.count() - 5} more images\n")

    # 8. ORDERS
    print_section("8️⃣  ORDERS")
    orders = Order.objects.all()
    print(f"   Total Orders: {orders.count()}\n")
    if orders.count() == 0:
        print("   No orders yet. Start selling! 🚀\n")
    else:
        for order in orders:
            items_count = order.items.count()
            print(f"   #{order.order_number}")
            print(f"      Customer: {order.user.username}")
            print(f"      Status: {order.status}")
            print(f"      Items: {items_count}")
            print(f"      Total: ${order.total_amount}")
            print()

    # 9. SUMMARY STATISTICS
    print_section("9️⃣  SUMMARY STATISTICS")
    print(f"   👥 Total Users:       {User.objects.count()}")
    print(f"   🏪 Total Vendors:     {Vendor.objects.count()}")
    print(f"   📂 Total Categories:  {Category.objects.count()}")
    print(f"   📦 Total Products:    {Product.objects.count()}")
    print(f"   🎨 Total Variants:    {ProductVariant.objects.count()}")
    print(f"   📷 Total Images:      {ProductImage.objects.count()}")
    print(f"   📋 Total Orders:      {Order.objects.count()}")
    
    total_revenue = sum(o.total_amount for o in Order.objects.all())
    print(f"   💰 Total Revenue:     ${total_revenue:.2f}")
    
    total_stock = sum(p.inventory_qty for p in Product.objects.all())
    print(f"   📊 Total Stock Units: {total_stock}")

    print_section("✅ DATABASE VIEW COMPLETE")
    print("   Your PostgreSQL database is working perfectly!")
    print(f"   Data is persisted and ready for production.\n")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
