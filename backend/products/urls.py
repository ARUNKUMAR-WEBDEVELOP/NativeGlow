from django.urls import path
from .views import (
    CategoryListView,
    ProductListView,
    ProductCreateView,
    ProductDetailView,
    FeaturedProductsView,
    BestSellersView,
    NewArrivalsView,
)

urlpatterns = [
    path('', ProductListView.as_view(), name='product-list'),
    path('create/', ProductCreateView.as_view(), name='product-create'),
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('featured/', FeaturedProductsView.as_view(), name='product-featured'),
    path('best-sellers/', BestSellersView.as_view(), name='product-best-sellers'),
    path('new-arrivals/', NewArrivalsView.as_view(), name='product-new-arrivals'),
    path('<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),
]
