from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('admins', '0004_platformpaymentdetails'),
    ]

    operations = [
        migrations.AddField(
            model_name='adminuser',
            name='login_device_id',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]