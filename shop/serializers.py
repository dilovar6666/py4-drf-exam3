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

    def validate(self, attrs):
        draft = attrs.get("is_draft", getattr(self.instance, "is_draft", False))
        brand = attrs.get("brand", getattr(self.instance, "brand", None))
        category = attrs.get("category", getattr(self.instance, "category", None))
        if not draft and (brand is None or category is None):
            raise serializers.ValidationError({"is_draft": "Add a real manufacturer and product category before publishing a product."})
        return attrs


class SparePartImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SparePartImage
        fields = "__all__"


class PartCompatibilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = PartCompatibility
        fields = "__all__"


class ExternalSearchResultSerializer(serializers.Serializer):
    """Stable frontend shape independent of Exa's provider response."""
    title = serializers.CharField(max_length=300)
    url = serializers.URLField(max_length=2048)
    snippet = serializers.CharField(max_length=600, allow_blank=True)
    source = serializers.CharField(max_length=255)


class FavoriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Favorite
        fields = "__all__"
        extra_kwargs = {"user": {"read_only": True}}


class CartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cart
        fields = "__all__"
        extra_kwargs = {"user": {"read_only": True}}


class CartItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = "__all__"
        extra_kwargs = {"cart": {"read_only": True}}

    def validate_spare_part(self, value):
        if value.is_draft:
            raise serializers.ValidationError("Draft products are not available to customers.")
        return value
