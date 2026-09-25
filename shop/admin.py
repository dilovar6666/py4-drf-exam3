from django.contrib import admin

from .models import (
    Cart,
    CartItem,
    Favorite,
    PartBrand,
    PartCompatibility,
    ProductCategory,
    SparePart,
    SparePartImage,
)


@admin.register(PartBrand)
class PartBrandAdmin(admin.ModelAdmin):
    list_display = ("name", "website_url", "logo_url")
    search_fields = ("name",)


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "description")
    search_fields = ("name",)


@admin.register(SparePart)
class SparePartAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "brand",
        "category",
        "sku",
        "oem_number",
        "car_part",
    )
    list_filter = ("brand", "category", "car_part")
    search_fields = ("name", "sku", "oem_number")
    list_select_related = ("brand", "category", "car_part")


@admin.register(SparePartImage)
class SparePartImageAdmin(admin.ModelAdmin):
    list_display = ("spare_part", "image_url")
    search_fields = ("spare_part__name", "image_url")
    list_select_related = ("spare_part",)


@admin.register(PartCompatibility)
class PartCompatibilityAdmin(admin.ModelAdmin):
    list_display = ("spare_part", "car")
    list_filter = ("spare_part", "car")
    search_fields = (
        "spare_part__name",
        "spare_part__sku",
        "car__car_model__name",
        "car__car_model__brand__name",
    )
    list_select_related = ("spare_part", "car__car_model__brand")


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("user", "spare_part", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__username", "user__email", "spare_part__name")
    list_select_related = ("user", "spare_part")


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at", "updated_at")
    search_fields = ("user__username", "user__email")
    list_select_related = ("user",)


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ("cart", "spare_part", "quantity", "created_at")
    list_filter = ("created_at",)
    search_fields = (
        "cart__user__username",
        "cart__user__email",
        "spare_part__name",
        "spare_part__sku",
    )
    list_select_related = ("cart__user", "spare_part")
