from django.contrib import admin
from django import forms
from django.core.exceptions import ValidationError

from .models import AdminUser


class AdminUserCreationForm(forms.ModelForm):
    creator_email = forms.EmailField(required=True, help_text='Superadmin email required to create admin accounts.')
    creator_password = forms.CharField(required=True, widget=forms.PasswordInput)

    class Meta:
        model = AdminUser
        fields = ('full_name', 'email', 'password', 'is_superadmin')

    def clean(self):
        cleaned_data = super().clean()
        creator_email = cleaned_data.get('creator_email')
        creator_password = cleaned_data.get('creator_password')

        creator = AdminUser.objects.filter(email__iexact=creator_email, is_superadmin=True).first()
        if not creator or not creator.check_password(creator_password or ''):
            raise ValidationError('Only a valid superadmin can create new admin accounts.')

        return cleaned_data


@admin.register(AdminUser)
class AdminUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'full_name', 'email', 'is_superadmin', 'created_at')
    list_filter = ('is_superadmin', 'created_at')
    search_fields = ('full_name', 'email')
    readonly_fields = ('created_at',)

    def get_form(self, request, obj=None, **kwargs):
        if obj is None:
            kwargs['form'] = AdminUserCreationForm
        return super().get_form(request, obj, **kwargs)
