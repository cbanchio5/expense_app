from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("receipts", "0005_receipt_settled_at_householdnotification"),
    ]

    operations = [
        migrations.AddField(
            model_name="receipt",
            name="category",
            field=models.CharField(
                choices=[
                    ("supermarket", "Supermarket"),
                    ("bills", "Bills"),
                    ("taxes", "Taxes"),
                    ("entertainment", "Entertainment"),
                    ("other", "Other"),
                ],
                db_index=True,
                default="other",
                max_length=32,
            ),
        ),
    ]
