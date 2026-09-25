from django.urls import path

from .views import (
    CarBrandDetailView,
    CarBrandListView,
    CarDetailView,
    CarListView,
    CarModelDetailView,
    CarModelListView,
    CarPartByCarListView,
    CarPartByComponentDetailView,
    CarPartDetailView,
    CarPartListView,
    CarPartRelatedListView,
    CarPartSourceListView,
    CarPartSpecificationListView,
    PartCategoryDetailView,
    PartCategoryListView,
    PartSourceDetailView,
    PartSourceListView,
    PartSpecificationDetailView,
    PartSpecificationListView,
    RelatedCarPartDetailView,
    RelatedCarPartListView,
)


urlpatterns = [
    path("", CarListView.as_view(), name="car-list"),
    path("<int:pk>/", CarDetailView.as_view(), name="car-detail"),
    path("brands/", CarBrandListView.as_view(), name="car-brand-list"),
    path("brands/<int:pk>/", CarBrandDetailView.as_view(), name="car-brand-detail"),
    path("models/", CarModelListView.as_view(), name="car-model-list"),
    path("models/<int:pk>/", CarModelDetailView.as_view(), name="car-model-detail"),
    path("categories/", PartCategoryListView.as_view(), name="part-category-list"),
    path(
        "categories/<int:pk>/",
        PartCategoryDetailView.as_view(),
        name="part-category-detail",
    ),
    path("parts/", CarPartListView.as_view(), name="car-part-list"),
    path("parts/<int:pk>/", CarPartDetailView.as_view(), name="car-part-detail"),
    path(
        "<int:car_id>/parts/",
        CarPartByCarListView.as_view(),
        name="car-part-by-car-list",
    ),
    path(
        "<int:car_id>/parts/<str:component_id>/",
        CarPartByComponentDetailView.as_view(),
        name="car-part-by-component-detail",
    ),
    path(
        "specifications/",
        PartSpecificationListView.as_view(),
        name="part-specification-list",
    ),
    path(
        "specifications/<int:pk>/",
        PartSpecificationDetailView.as_view(),
        name="part-specification-detail",
    ),
    path(
        "parts/<int:car_part_id>/specifications/",
        CarPartSpecificationListView.as_view(),
        name="car-part-specification-list",
    ),
    path(
        "related-parts/",
        RelatedCarPartListView.as_view(),
        name="related-car-part-list",
    ),
    path(
        "related-parts/<int:pk>/",
        RelatedCarPartDetailView.as_view(),
        name="related-car-part-detail",
    ),
    path(
        "parts/<int:car_part_id>/related-parts/",
        CarPartRelatedListView.as_view(),
        name="car-part-related-list",
    ),
    path("sources/", PartSourceListView.as_view(), name="part-source-list"),
    path(
        "sources/<int:pk>/",
        PartSourceDetailView.as_view(),
        name="part-source-detail",
    ),
    path(
        "parts/<int:car_part_id>/sources/",
        CarPartSourceListView.as_view(),
        name="car-part-source-list",
    ),
]
