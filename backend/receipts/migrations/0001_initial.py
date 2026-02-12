from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Receipt",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("uploaded_by", models.CharField(choices=[("user_1", "User 1"), ("user_2", "User 2")], max_length=16)),
                ("image", models.ImageField(upload_to="receipts/")),
                ("expense_date", models.DateField(db_index=True, default=django.utils.timezone.localdate)),
                ("vendor", models.CharField(blank=True, max_length=255)),
                ("currency", models.CharField(blank=True, default="USD", max_length=8)),
                ("subtotal", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("tax", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("tip", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("total", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("items", models.JSONField(blank=True, default=list)),
                ("raw_text", models.TextField(blank=True)),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-expense_date", "-uploaded_at"]},
        ),
    ]
