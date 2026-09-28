import os

from rest_framework.exceptions import ValidationError
from rest_framework.generics import *
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from .filters import filter_part_compatibilities, filter_spare_parts
from .models import *
from .serializers import *
from .services import external_search, local_search
from cars.models import Car, CarPart


class PartsSearchView(APIView):

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if len(query) < 2 or len(query) > 200:
            raise ValidationError({"q": "Search query must contain 2 to 200 characters."})
        car_id = request.query_params.get("car") or None
        component_id = request.query_params.get("component") or None
        if car_id and not str(car_id).isdigit():
            raise ValidationError({"car": "Enter a valid car id."})
        car = Car.objects.select_related("car_model", "car_model__brand").filter(pk=car_id, is_active=True).first() if car_id else None
        component = CarPart.objects.filter(car=car, component_id=component_id).first() if car and component_id else None
        if component_id and car and not component:
            raise ValidationError({"component": "This component is not available for the selected car."})
        data = {"local": local_search(query, car_id=car_id, component_id=component_id)}
        if request.query_params.get("external") == "1":
            data["external"] = external_search(query, car=car, component=component)
        else:
            data["external"] = {
                "available": bool(os.environ.get("EXA_API_KEY", "").strip()),
                "provider": "Exa Search",
                "results": [],
                **({} if os.environ.get("EXA_API_KEY", "").strip() else {"error_code": "EXTERNAL_SEARCH_NOT_CONFIGURED"}),
            }
        return Response(data)


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
        queryset = SparePart.objects.filter(is_draft=False).order_by("id")
        return filter_spare_parts(queryset, self.request)


class SparePartDetailView(RetrieveAPIView):
    queryset = SparePart.objects.filter(is_draft=False)
    serializer_class = SparePartSerializer


class SparePartByCarPartListView(ListAPIView):
    serializer_class = SparePartSerializer

    def get_queryset(self):
        return SparePart.objects.filter(is_draft=False).filter(
            car_part_id=self.kwargs["car_part_id"]
        ).order_by("id")


class CompatibleSparePartByCarListView(ListAPIView):
    serializer_class = SparePartSerializer

    def get_queryset(self):
        queryset = SparePart.objects.filter(is_draft=False).filter(
            compatibilities__car_id=self.kwargs["car_id"]
        ).distinct().order_by("id")
        return filter_spare_parts(queryset, self.request)


class SparePartImageListView(ListAPIView):
    queryset = SparePartImage.objects.filter(spare_part__is_draft=False).order_by("id")
    serializer_class = SparePartImageSerializer


class SparePartImageDetailView(RetrieveAPIView):
    queryset = SparePartImage.objects.filter(spare_part__is_draft=False)
    serializer_class = SparePartImageSerializer


class SparePartImageByPartListView(ListAPIView):
    serializer_class = SparePartImageSerializer

    def get_queryset(self):
        return SparePartImage.objects.filter(spare_part__is_draft=False).filter(
            spare_part_id=self.kwargs["spare_part_id"]
        ).order_by("id")


class PartCompatibilityListView(ListAPIView):
    serializer_class = PartCompatibilitySerializer

    def get_queryset(self):
        queryset = PartCompatibility.objects.filter(spare_part__is_draft=False).order_by("id")
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
        if spare_part.is_draft:
            raise ValidationError("Draft products are not available to customers.")

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
