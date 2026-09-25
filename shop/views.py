from rest_framework.generics import ListAPIView, RetrieveAPIView

from .filters import filter_part_compatibilities, filter_spare_parts
from .models import (
    PartBrand,
    PartCompatibility,
    ProductCategory,
    SparePart,
    SparePartImage,
)
from .serializers import (
    PartBrandSerializer,
    PartCompatibilitySerializer,
    ProductCategorySerializer,
    SparePartImageSerializer,
    SparePartSerializer,
)


class PartBrandListView(ListAPIView):
    queryset = PartBrand.objects.all()
    serializer_class = PartBrandSerializer


class PartBrandDetailView(RetrieveAPIView):
    queryset = PartBrand.objects.all()
    serializer_class = PartBrandSerializer


class ProductCategoryListView(ListAPIView):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer


class ProductCategoryDetailView(RetrieveAPIView):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer


class SparePartListView(ListAPIView):
    serializer_class = SparePartSerializer

    def get_queryset(self):
        queryset = SparePart.objects.all()
        return filter_spare_parts(queryset, self.request)


class SparePartDetailView(RetrieveAPIView):
    queryset = SparePart.objects.all()
    serializer_class = SparePartSerializer


class SparePartByCarPartListView(ListAPIView):
    serializer_class = SparePartSerializer

    def get_queryset(self):
        return SparePart.objects.filter(car_part_id=self.kwargs["car_part_id"])


class CompatibleSparePartByCarListView(ListAPIView):
    serializer_class = SparePartSerializer

    def get_queryset(self):
        return SparePart.objects.filter(
            compatibilities__car_id=self.kwargs["car_id"]
        ).distinct()


class SparePartImageListView(ListAPIView):
    queryset = SparePartImage.objects.all()
    serializer_class = SparePartImageSerializer


class SparePartImageDetailView(RetrieveAPIView):
    queryset = SparePartImage.objects.all()
    serializer_class = SparePartImageSerializer


class SparePartImageByPartListView(ListAPIView):
    serializer_class = SparePartImageSerializer

    def get_queryset(self):
        return SparePartImage.objects.filter(
            spare_part_id=self.kwargs["spare_part_id"]
        )


class PartCompatibilityListView(ListAPIView):
    serializer_class = PartCompatibilitySerializer

    def get_queryset(self):
        queryset = PartCompatibility.objects.all()
        return filter_part_compatibilities(queryset, self.request)


class PartCompatibilityDetailView(RetrieveAPIView):
    queryset = PartCompatibility.objects.all()
    serializer_class = PartCompatibilitySerializer
