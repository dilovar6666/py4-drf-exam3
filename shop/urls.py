from django.urls import path

from .views import (
    CompatibleSparePartByCarListView,
    PartBrandDetailView,
    PartBrandListView,
    PartCompatibilityDetailView,
    PartCompatibilityListView,
    ProductCategoryDetailView,
    ProductCategoryListView,
    SparePartByCarPartListView,
    SparePartDetailView,
    SparePartImageByPartListView,
    SparePartImageDetailView,
    SparePartImageListView,
    SparePartListView,
)


urlpatterns = [
    path("brands/", PartBrandListView.as_view(), name="part-brand-list"),
    path("brands/<int:pk>/", PartBrandDetailView.as_view(), name="part-brand-detail"),
    path(
        "categories/",
        ProductCategoryListView.as_view(),
        name="product-category-list",
    ),
    path(
        "categories/<int:pk>/",
        ProductCategoryDetailView.as_view(),
        name="product-category-detail",
    ),
    path("parts/", SparePartListView.as_view(), name="spare-part-list"),
    path("parts/<int:pk>/", SparePartDetailView.as_view(), name="spare-part-detail"),
    path(
        "car-parts/<int:car_part_id>/spare-parts/",
        SparePartByCarPartListView.as_view(),
        name="spare-part-by-car-part-list",
    ),
    path(
        "cars/<int:car_id>/parts/",
        CompatibleSparePartByCarListView.as_view(),
        name="compatible-spare-part-by-car-list",
    ),
    path("images/", SparePartImageListView.as_view(), name="spare-part-image-list"),
    path(
        "images/<int:pk>/",
        SparePartImageDetailView.as_view(),
        name="spare-part-image-detail",
    ),
    path(
        "parts/<int:spare_part_id>/images/",
        SparePartImageByPartListView.as_view(),
        name="spare-part-image-by-part-list",
    ),
    path(
        "compatibilities/",
        PartCompatibilityListView.as_view(),
        name="part-compatibility-list",
    ),
    path(
        "compatibilities/<int:pk>/",
        PartCompatibilityDetailView.as_view(),
        name="part-compatibility-detail",
    ),
]
