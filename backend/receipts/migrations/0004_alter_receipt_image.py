from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("receipts", "0003_receipt_is_saved"),
    ]

    operations = [
        migrations.AlterField(
            model_name="receipt",
            name="image",
            field=models.ImageField(blank=True, null=True, upload_to="receipts/"),
        ),
    ]
