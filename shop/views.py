from rest_framework.exceptions import ValidationError
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveDestroyAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import IsAuthenticated

from .filters import filter_part_compatibilities, filter_spare_parts
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
from .serializers import (
    CartItemSerializer,
    CartSerializer,
    FavoriteSerializer,
    PartBrandSerializer,
    PartCompatibilitySerializer,
    ProductCategorySerializer,
    SparePartImageSerializer,
    SparePartSerializer,
)


class PartBrandListView(ListAPIView):
    queryset = PartBrand.objects.all().order_by("id")
    serializer_class = PartBrandSerializer


class PartBrandDetailView(RetrieveAPIView):
    queryset = PartBrand.objects.all()
    serializer_class = PartBrandSerializer


class ProductCategoryListView(ListAPIView):
    queryset = ProductCategory.objects.all().order_by("id")
    serializer_class = ProductCategorySerializer


class ProductCategoryDetailView(RetrieveAPIView):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer


class SparePartListView(ListAPIView):
    serializer_class = SparePartSerializer

    def get_queryset(self):
        queryset = SparePart.objects.all().order_by("id")
        return filter_spare_parts(queryset, self.request)


class SparePartDetailView(RetrieveAPIView):
    queryset = SparePart.objects.all()
    serializer_class = SparePartSerializer


class SparePartByCarPartListView(ListAPIView):
    serializer_class = SparePartSerializer

    def get_queryset(self):
        return SparePart.objects.filter(
            car_part_id=self.kwargs["car_part_id"]
        ).order_by("id")


class CompatibleSparePartByCarListView(ListAPIView):
    serializer_class = SparePartSerializer

    def get_queryset(self):
        return SparePart.objects.filter(
            compatibilities__car_id=self.kwargs["car_id"]
        ).distinct().order_by("id")


class SparePartImageListView(ListAPIView):
    queryset = SparePartImage.objects.all().order_by("id")
    serializer_class = SparePartImageSerializer


class SparePartImageDetailView(RetrieveAPIView):
    queryset = SparePartImage.objects.all()
    serializer_class = SparePartImageSerializer


class SparePartImageByPartListView(ListAPIView):
    serializer_class = SparePartImageSerializer

    def get_queryset(self):
        return SparePartImage.objects.filter(
            spare_part_id=self.kwargs["spare_part_id"]
        ).order_by("id")


class PartCompatibilityListView(ListAPIView):
    serializer_class = PartCompatibilitySerializer

    def get_queryset(self):
        queryset = PartCompatibility.objects.all().order_by("id")
        return filter_part_compatibilities(queryset, self.request)


class PartCompatibilityDetailView(RetrieveAPIView):
    queryset = PartCompatibility.objects.all()
    serializer_class = PartCompatibilitySerializer


class FavoriteListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FavoriteSerializer

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user).order_by("id")

    def perform_create(self, serializer):
        spare_part = serializer.validated_data["spare_part"]

        if Favorite.objects.filter(
            user=self.request.user,
            spare_part=spare_part,
        ).exists():
            raise ValidationError("This spare part is already in favorites.")

        serializer.save(user=self.request.user)


class FavoriteDetailView(RetrieveDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FavoriteSerializer

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user)


class CartListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CartSerializer

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user).order_by("id")

    def perform_create(self, serializer):
        if Cart.objects.filter(user=self.request.user).exists():
            raise ValidationError("The user already has a cart.")

        serializer.save(user=self.request.user)


class CartDetailView(RetrieveDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CartSerializer

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user)


class CartItemListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CartItemSerializer

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user).order_by("id")

    def perform_create(self, serializer):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        serializer.save(cart=cart)


class CartItemDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CartItemSerializer

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user)
