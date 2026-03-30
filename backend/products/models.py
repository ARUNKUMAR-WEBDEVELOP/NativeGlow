from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='categories/', blank=True, null=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    """A product listed on NativeGlow by NativeGlow or an approved vendor."""

    vendor = models.ForeignKey(
        'vendors.Vendor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        help_text='Leave blank for NativeGlow own products.'
    )
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, related_name='products'
    )
    title = models.CharField(max_length=200)
    name = models.CharField(max_length=200, blank=True)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    short_description = models.CharField(max_length=500, blank=True)
    ingredients = models.TextField(
        blank=True,
        help_text='List key natural ingredients. Important for chemical-free verification.'
    )
    product_type = models.CharField(
        max_length=20,
        choices=[
            ('skincare', 'Herbal Skincare'),
            ('clothing', 'Everyday Clothing'),
            ('bodycare', 'Body Care'),
        ],
        default='skincare',
    )
    tags = models.CharField(max_length=300, blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    original_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    discount_percent = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(90)]
    )
    discounted_price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    discount_price = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    compare_price = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    sku = models.CharField(max_length=50, unique=True)
    inventory_qty = models.PositiveIntegerField(default=0)
    available_quantity = models.PositiveIntegerField(default=0)
    unit = models.CharField(
        max_length=10,
        choices=[
            ('ml', 'ML'),
            ('gm', 'GM'),
            ('pcs', 'PCS'),
        ],
        default='pcs',
    )
    is_natural_certified = models.BooleanField(default=False)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    category_type = models.CharField(
        max_length=20,
        choices=[
            ('face_wash', 'Face Wash'),
            ('soap', 'Soap'),
            ('serum', 'Serum'),
            ('moisturizer', 'Moisturizer'),
            ('hair_oil', 'Hair Oil'),
            ('other', 'Other'),
        ],
        default='other',
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
            ('active', 'Active'),
            ('draft', 'Draft'),
            ('out_of_stock', 'Out of Stock'),
        ],
        default='pending',
    )
    admin_rejection_reason = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_bestseller = models.BooleanField(default=False)
    is_new_arrival = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    is_visible = models.BooleanField(default=True)
    product_tag = models.CharField(max_length=100, blank=True)
    product_order = models.IntegerField(default=0)
    shipping_info = models.CharField(
        max_length=255,
        blank=True,
        default='Processing 1-2 days, delivery 5-8 business days'
    )
    seo_title = models.CharField(max_length=255, blank=True)
    seo_description = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['product_order', '-created_at']

    def clean(self):
        if self.status == 'approved' and not self.is_natural_certified:
            raise ValidationError(
                {'is_natural_certified': 'Only natural certified products can be approved/listed.'}
            )

    def save(self, *args, **kwargs):
        if self.discount_percent > 0:
            multiplier = Decimal('1') - (Decimal(self.discount_percent) / Decimal('100'))
            self.discounted_price = (self.price * multiplier).quantize(Decimal('0.01'))
            self.original_price = self.price
        else:
            self.discounted_price = None
            self.original_price = None
        if not self.name:
            self.name = self.title
        if self.available_quantity == 0 and self.inventory_qty:
            self.available_quantity = self.inventory_qty
        if self.inventory_qty == 0 and self.available_quantity:
            self.inventory_qty = self.available_quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name or self.title


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='images'
    )
    image_url = models.URLField()
    alt_text = models.CharField(max_length=255, blank=True)
    position = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ['position']

    def __str__(self):
        return f"{self.product.title} - Image {self.position}"


class ProductVariant(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='variants'
    )
    option_name = models.CharField(
        max_length=100, help_text='e.g. Size, Volume, Color'
    )
    option_value = models.CharField(
        max_length=100, help_text='e.g. M, 30ml, Green'
    )
    sku_suffix = models.CharField(max_length=50, blank=True)
    additional_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    stock = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.product.title} - {self.option_name}: {self.option_value}"
