import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("shop", "0001_initial")]

    operations = [
        migrations.AlterField(
            model_name="sparepart", name="brand",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="spare_parts", to="shop.partbrand"),
        ),
        migrations.AlterField(
            model_name="sparepart", name="category",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="spare_parts", to="shop.productcategory"),
        ),
        migrations.AlterField(model_name="sparepart", name="sku", field=models.CharField(blank=True, max_length=100)),
        migrations.AlterField(model_name="sparepart", name="oem_number", field=models.CharField(blank=True, max_length=100)),
        migrations.AddField(model_name="sparepart", name="is_draft", field=models.BooleanField(default=False)),
    ]
