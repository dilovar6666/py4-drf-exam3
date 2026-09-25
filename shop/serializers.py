from rest_framework import serializers

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


class PartBrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartBrand
        fields = "__all__"


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = "__all__"


class SparePartSerializer(serializers.ModelSerializer):
    class Meta:
        model = SparePart
        fields = "__all__"


class SparePartImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SparePartImage
        fields = "__all__"


class PartCompatibilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = PartCompatibility
        fields = "__all__"


class FavoriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Favorite
        fields = "__all__"


class CartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cart
        fields = "__all__"


class CartItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = "__all__"
