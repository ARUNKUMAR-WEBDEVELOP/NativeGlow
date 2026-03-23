from django.urls import path
from .views import (
    CategoryListView,
    ProductListView,
    ProductCreateView,
    ProductDetailView,
    FeaturedProductsView,
    BestSellersView,
    NewArrivalsView,
    PublicVendorStoreView,
    PublicProductDetailView,
    StoreSearchView,
    StoreCategoriesView,
    StoreFeaturedView,
)

urlpatterns = [
    path('', ProductListView.as_view(), name='product-list'),
    path('create/', ProductCreateView.as_view(), name='product-create'),
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('featured/', FeaturedProductsView.as_view(), name='product-featured'),
    path('best-sellers/', BestSellersView.as_view(), name='product-best-sellers'),
    path('new-arrivals/', NewArrivalsView.as_view(), name='product-new-arrivals'),
    path('<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),
    
    # Public store APIs (no authentication)
    path('store/search/', StoreSearchView.as_view(), name='store-search'),
    path('store/categories/', StoreCategoriesView.as_view(), name='store-categories'),
    path('store/featured/', StoreFeaturedView.as_view(), name='store-featured'),
    path('store/<slug:vendor_slug>/', PublicVendorStoreView.as_view(), name='public-vendor-store'),
    path('store/<slug:vendor_slug>/products/<int:product_id>/', PublicProductDetailView.as_view(), name='public-product-detail'),
]
