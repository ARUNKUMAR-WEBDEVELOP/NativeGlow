from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Product
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
)


class IsVendorOrAdmin(permissions.BasePermission):
    """Allow approved vendors and admin staff to create/edit products."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        is_vendor = (
            request.user.is_authenticated
            and hasattr(request.user, 'vendor_profile')
            and request.user.vendor_profile.status == 'approved'
        )
        return request.user.is_authenticated and (request.user.is_staff or is_vendor)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_staff:
            return True
        # Vendors can only edit their own products
        return (
            hasattr(request.user, 'vendor_profile')
            and obj.vendor == request.user.vendor_profile
        )


class CategoryListView(generics.ListAPIView):
    """GET /api/products/categories/"""
    serializer_class = CategorySerializer
    permission_classes = (permissions.AllowAny,)
    queryset = Category.objects.all()


class ProductListView(generics.ListAPIView):
    """GET /api/products/?category=herbal-skincare&tags=herbal"""
    serializer_class = ProductListSerializer
    permission_classes = (permissions.AllowAny,)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('title', 'tags', 'short_description')
    ordering_fields = ('price', 'created_at')

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True)
        category = self.request.query_params.get('category')
        tag = self.request.query_params.get('tag')
        vendor_id = self.request.query_params.get('vendor')
        brand = self.request.query_params.get('brand')
        if category:
            qs = qs.filter(category__slug=category)
        if tag:
            qs = qs.filter(tags__icontains=tag)
        if vendor_id:
            qs = qs.filter(vendor__id=vendor_id)
        if brand:
            normalized = brand.strip().lower()
            if normalized == 'nativeglow':
                qs = qs.filter(vendor__isnull=True)
            else:
                qs = qs.filter(vendor__brand_name__iexact=brand.strip())
        return qs


class FeaturedProductsView(generics.ListAPIView):
    """GET /api/products/featured/"""
    serializer_class = ProductListSerializer
    permission_classes = (permissions.AllowAny,)
    queryset = Product.objects.filter(is_active=True, is_featured=True)


class BestSellersView(generics.ListAPIView):
    """GET /api/products/best-sellers/"""
    serializer_class = ProductListSerializer
    permission_classes = (permissions.AllowAny,)
    queryset = Product.objects.filter(is_active=True, is_bestseller=True)


class NewArrivalsView(generics.ListAPIView):
    """GET /api/products/new-arrivals/"""
    serializer_class = ProductListSerializer
    permission_classes = (permissions.AllowAny,)
    queryset = Product.objects.filter(is_active=True, is_new_arrival=True)


class ProductCreateView(generics.CreateAPIView):
    """POST /api/products/  — vendor or admin creates a product."""
    serializer_class = ProductDetailSerializer
    permission_classes = (IsVendorOrAdmin,)

    def perform_create(self, serializer):
        vendor = getattr(self.request.user, 'vendor_profile', None)
        serializer.save(vendor=vendor)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET / PUT / DELETE /api/products/<slug>/"""
    serializer_class = ProductDetailSerializer
    permission_classes = (IsVendorOrAdmin,)
    queryset = Product.objects.filter(is_active=True)
    lookup_field = 'slug'
