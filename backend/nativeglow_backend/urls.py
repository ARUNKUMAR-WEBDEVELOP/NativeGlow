"""
URL configuration for nativeglow_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import os

from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include


def root_status(_request):
    return JsonResponse(
        {
            'service': 'nativeglow-backend',
            'status': 'ok',
            'google_login_configured': bool(os.environ.get('GOOGLE_CLIENT_ID', '').strip()),
        }
    )

urlpatterns = [
    path('', root_status, name='root-status'),
    path('healthz/', root_status, name='healthz'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/vendors/', include('vendors.urls')),
    path('api/products/', include('products.urls')),
    path('api/orders/', include('orders.urls')),
]
