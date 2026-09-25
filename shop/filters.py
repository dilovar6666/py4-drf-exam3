def filter_spare_parts(queryset, request):
    brand = request.query_params.get("brand")
    category = request.query_params.get("category")
    car_part = request.query_params.get("car_part")
    sku = request.query_params.get("sku")
    oem_number = request.query_params.get("oem_number")

    if brand:
        queryset = queryset.filter(brand_id=brand)

    if category:
        queryset = queryset.filter(category_id=category)

    if car_part:
        queryset = queryset.filter(car_part_id=car_part)

    if sku:
        queryset = queryset.filter(sku=sku)

    if oem_number:
        queryset = queryset.filter(oem_number=oem_number)

    return queryset


def filter_part_compatibilities(queryset, request):
    car = request.query_params.get("car")
    spare_part = request.query_params.get("spare_part")

    if car:
        queryset = queryset.filter(car_id=car)

    if spare_part:
        queryset = queryset.filter(spare_part_id=spare_part)

    return queryset
