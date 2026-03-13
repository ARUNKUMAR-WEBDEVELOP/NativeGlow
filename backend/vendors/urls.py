from django.urls import path
from .views import (
    VendorListView,
    VendorDetailView,
    ApplyAsVendorView,
    MyApplicationView,
    MyVendorAnalyticsView,
    AdminVendorApplicationListView,
    ReviewApplicationView,
)

urlpatterns = [
    path('', VendorListView.as_view(), name='vendor-list'),
    path('<int:pk>/', VendorDetailView.as_view(), name='vendor-detail'),
    path('apply/', ApplyAsVendorView.as_view(), name='vendor-apply'),
    path('my-application/', MyApplicationView.as_view(), name='vendor-my-application'),
    path('my-analytics/', MyVendorAnalyticsView.as_view(), name='vendor-my-analytics'),
    path('applications/', AdminVendorApplicationListView.as_view(), name='vendor-application-list'),
    path(
        'applications/<int:pk>/review/',
        ReviewApplicationView.as_view(),
        name='vendor-application-review',
    ),
]
