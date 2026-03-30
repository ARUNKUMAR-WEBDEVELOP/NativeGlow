from rest_framework import serializers

from .models import Buyer


class BuyerGoogleLoginSerializer(serializers.Serializer):
    google_token = serializers.CharField()
    vendor_slug = serializers.CharField()


class BuyerProfileSerializer(serializers.ModelSerializer):
    vendor_slug = serializers.CharField(source='vendor.vendor_slug', read_only=True)

    class Meta:
        model = Buyer
        fields = (
            'id',
            'vendor_slug',
            'full_name',
            'email',
            'google_id',
            'profile_picture',
            'phone',
            'default_address',
            'default_pincode',
            'is_active',
            'created_at',
            'last_login',
        )
        read_only_fields = (
            'id',
            'vendor_slug',
            'email',
            'google_id',
            'profile_picture',
            'is_active',
            'created_at',
            'last_login',
        )


class BuyerUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Buyer
        fields = ('phone', 'default_address', 'default_pincode')
