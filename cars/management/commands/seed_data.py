from django.core.management.base import BaseCommand

from cars.models import (
    Car,
    CarBrand,
    CarModel,
    CarPart,
    PartCategory,
    PartSource,
    PartSpecification,
    RelatedCarPart,
)
from shop.models import (
    PartBrand,
    PartCompatibility,
    ProductCategory,
    SparePart,
    SparePartImage,
)


class Command(BaseCommand):
    help = "Create development catalog data for Auto Anatomy"

    def handle(self, *args, **options):
        cars = self.create_cars()
        categories = self.create_part_categories()
        car_parts = self.create_car_parts(cars, categories)
        self.create_part_details(cars, car_parts)
        self.create_spare_parts(cars, car_parts)

        self.stdout.write(self.style.SUCCESS("Auto Anatomy test data is ready."))

    def create_cars(self):
        car_data = [
            {
                "brand": "BMW",
                "model": "M3",
                "year": 2024,
                "description": "High-performance sports sedan for development testing.",
                "model_url": "https://example.com/models/bmw-m3-2024.glb",
                "image_url": "https://placehold.co/1200x800?text=BMW+M3",
                "logo_url": "https://placehold.co/300x120?text=BMW",
            },
            {
                "brand": "Toyota",
                "model": "Supra",
                "year": 2024,
                "description": "Sports coupe used to test the 3D Lab catalog flow.",
                "model_url": "https://example.com/models/toyota-supra-2024.glb",
                "image_url": "https://placehold.co/1200x800?text=Toyota+Supra",
                "logo_url": "https://placehold.co/300x120?text=Toyota",
            },
            {
                "brand": "Mercedes-Benz",
                "model": "Mercedes-AMG C 63",
                "year": 2024,
                "description": "Performance sedan used for frontend and API development.",
                "model_url": "https://example.com/models/mercedes-amg-c63-2024.glb",
                "image_url": "https://placehold.co/1200x800?text=AMG+C63",
                "logo_url": "https://placehold.co/300x120?text=Mercedes-Benz",
            },
            {
                "brand": "Audi",
                "model": "R8",
                "year": 2008,
                "description": "Audi R8 prepared for the Auto Anatomy interactive 3D lab.",
                "model_url": "http://127.0.0.1:4173/assets/models/AudiR8.glb",
                "image_url": "https://placehold.co/1200x800?text=Audi+R8",
                "logo_url": "https://placehold.co/300x120?text=Audi",
            },
        ]

        cars = {}
        for item in car_data:
            brand, _ = CarBrand.objects.update_or_create(
                name=item["brand"],
                defaults={"logo_url": item["logo_url"]},
            )
            car_model, _ = CarModel.objects.get_or_create(
                brand=brand,
                name=item["model"],
            )
            car, _ = Car.objects.update_or_create(
                car_model=car_model,
                year=item["year"],
                defaults={
                    "description": item["description"],
                    "model_url": item["model_url"],
                    "image_url": item["image_url"],
                },
            )
            cars[item["brand"]] = car

        return cars

    def create_part_categories(self):
        category_data = {
            "Engine": "Engine and internal combustion components.",
            "Transmission": "Transmission and drivetrain components.",
            "Brakes": "Brake system components.",
            "Suspension": "Suspension and chassis components.",
            "Cooling": "Engine cooling system components.",
            "Electrical": "Electrical system components.",
            "Exhaust": "Exhaust system components.",
            "Body": "Vehicle body panels and exterior assemblies.",
            "Wheels": "Wheel and tyre assemblies.",
            "Interior": "Cabin, seating, and driver controls.",
            "Glass": "Automotive glazing components.",
            "Lighting": "Exterior lighting assemblies.",
        }

        categories = {}
        for name, description in category_data.items():
            category, _ = PartCategory.objects.update_or_create(
                name=name,
                defaults={"description": description},
            )
            categories[name] = category

        return categories

    def create_car_parts(self, cars, categories):
        standard_part_data = [
            ("engine", "Engine", "Engine", "Produces power for the vehicle."),
            (
                "transmission",
                "Transmission",
                "Transmission",
                "Transfers engine power to the wheels.",
            ),
            (
                "front_brakes",
                "Front Brakes",
                "Brakes",
                "Slows the front wheels.",
            ),
            (
                "rear_brakes",
                "Rear Brakes",
                "Brakes",
                "Slows the rear wheels.",
            ),
            ("radiator", "Radiator", "Cooling", "Removes heat from engine coolant."),
            ("battery", "Battery", "Electrical", "Supplies electrical power."),
            ("exhaust", "Exhaust", "Exhaust", "Routes exhaust gases safely."),
            (
                "front_suspension",
                "Front Suspension",
                "Suspension",
                "Supports and controls the front wheels.",
            ),
            (
                "rear_suspension",
                "Rear Suspension",
                "Suspension",
                "Supports and controls the rear wheels.",
            ),
        ]
        audi_part_data = [
            ("body_shell", "Body Shell", "Body", "Forms the primary exterior body surface."),
            ("carbon_sideblades", "Carbon Sideblades", "Body", "Finishes the side air-channel area behind the cabin."),
            ("fuel_filler_door", "Fuel Filler Door", "Body", "Closes the exterior fuel-filler opening."),
            ("exterior_badges", "Exterior Badges", "Body", "Identifies the vehicle on its exterior surfaces."),
            ("rear_lower_trim", "Rear Lower Trim", "Body", "Finishes the lower rear body area."),
            ("front_grille", "Front Grille", "Body", "Closes and protects the front air inlet."),
            ("front_license_plate", "Front License Plate", "Body", "Carries the front registration marking."),
            ("rear_license_plate", "Rear License Plate", "Body", "Carries the rear registration marking."),
            ("wiper_left", "Left Windshield Wiper", "Body", "Clears water from the left windshield area."),
            ("wiper_right", "Right Windshield Wiper", "Body", "Clears water from the right windshield area."),
            ("underbody", "Underbody Panel", "Body", "Covers and protects the underside of the vehicle."),
            ("wheel_arch_liners", "Wheel-Arch Liners", "Body", "Shield the wheel housings from road debris."),
            ("rear_engine_cover", "Rear Deck / Engine Cover", "Body", "Closes the rear engine compartment."),
            ("door_left", "Left Door", "Body", "Provides left-side cabin access."),
            ("door_trim_left", "Left Door Interior Trim", "Body", "Finishes the cabin-facing surface of the left door."),
            ("door_right", "Right Door", "Body", "Provides right-side cabin access."),
            ("door_trim_right", "Right Door Interior Trim", "Body", "Finishes the cabin-facing surface of the right door."),
            ("windshield", "Windshield", "Glass", "Provides forward visibility and cabin enclosure."),
            ("rear_window", "Rear Window", "Glass", "Provides rearward visibility and cabin enclosure."),
            ("cabin_engine_partition_glass", "Cabin / Engine Partition Glass", "Glass", "Separates the cabin from the visible rear engine bay."),
            ("side_window_left", "Left Side Window", "Glass", "Provides left-side visibility and cabin enclosure."),
            ("side_window_right", "Right Side Window", "Glass", "Provides right-side visibility and cabin enclosure."),
            ("interior_shell", "Interior Shell", "Interior", "Forms the main cabin environment."),
            ("dashboard", "Dashboard", "Interior", "Supports the primary cabin controls and displays."),
            ("brake_pedal", "Brake Pedal", "Interior", "Provides the driver input for braking."),
            ("clutch_pedal", "Clutch Pedal", "Interior", "Provides the driver input for clutch operation."),
            ("accelerator_pedal", "Accelerator Pedal", "Interior", "Provides the driver input for power demand."),
            ("air_vent_left", "Left Air Vent", "Interior", "Directs conditioned air into the left cabin area."),
            ("air_vent_center", "Center Air Vent", "Interior", "Directs conditioned air into the centre cabin area."),
            ("air_vent_right", "Right Air Vent", "Interior", "Directs conditioned air into the right cabin area."),
            ("center_tunnel", "Center Tunnel", "Interior", "Forms the central longitudinal cabin structure."),
            ("cup_holder", "Cup Holder", "Interior", "Secures a drink container in the cabin."),
            ("gear_shifter", "Gear Shifter and Gate", "Interior", "Provides the driver interface for selecting gears."),
            ("infotainment_display", "Infotainment Display", "Interior", "Presents vehicle and media information."),
            ("cd_player", "CD Player", "Interior", "Represents the cabin media-player unit."),
            ("instrument_cluster", "Instrument Cluster", "Interior", "Presents driving and vehicle-status information."),
            ("dashboard_speaker_grille", "Dashboard Speaker Grille", "Interior", "Protects the dashboard loudspeaker opening."),
            ("rear_view_mirror", "Rear-View Mirror", "Interior", "Provides the driver a rearward view."),
            ("seats", "Seat Assembly", "Interior", "Supports and positions the vehicle occupants."),
            ("steering_wheel", "Steering Wheel", "Interior", "Provides the driver's primary directional input."),
            ("front_left_tire", "Front Left Tire", "Wheels", "Provides the front-left road contact patch."),
            ("front_left_rim", "Front Left Rim", "Wheels", "Supports the front-left tire and mounts it to the hub."),
            ("front_right_tire", "Front Right Tire", "Wheels", "Provides the front-right road contact patch."),
            ("front_right_rim", "Front Right Rim", "Wheels", "Supports the front-right tire and mounts it to the hub."),
            ("rear_left_tire", "Rear Left Tire", "Wheels", "Provides the rear-left road contact patch."),
            ("rear_left_rim", "Rear Left Rim", "Wheels", "Supports the rear-left tire and mounts it to the hub."),
            ("rear_right_tire", "Rear Right Tire", "Wheels", "Provides the rear-right road contact patch."),
            ("rear_right_rim", "Rear Right Rim", "Wheels", "Supports the rear-right tire and mounts it to the hub."),
            ("front_left_brake_disc", "Front Left Brake Disc", "Brakes", "Provides the front-left rotating braking surface."),
            ("front_left_brake_caliper", "Front Left Brake Caliper", "Brakes", "Applies friction to the front-left brake disc."),
            ("front_right_brake_disc", "Front Right Brake Disc", "Brakes", "Provides the front-right rotating braking surface."),
            ("front_right_brake_caliper", "Front Right Brake Caliper", "Brakes", "Applies friction to the front-right brake disc."),
            ("rear_left_brake_disc", "Rear Left Brake Disc", "Brakes", "Provides the rear-left rotating braking surface."),
            ("rear_left_brake_caliper", "Rear Left Brake Caliper", "Brakes", "Applies friction to the rear-left brake disc."),
            ("rear_right_brake_disc", "Rear Right Brake Disc", "Brakes", "Provides the rear-right rotating braking surface."),
            ("rear_right_brake_caliper", "Rear Right Brake Caliper", "Brakes", "Applies friction to the rear-right brake disc."),
            ("engine_block", "Engine Block and Central Assembly", "Engine", "Contains the central power-producing engine assembly."),
            ("engine_cover_left", "Left Engine Cover", "Engine", "Covers and finishes the left side of the engine assembly."),
            ("engine_cover_right", "Right Engine Cover", "Engine", "Covers and finishes the right side of the engine assembly."),
            ("engine_rear_panel", "Rear Engine Panel", "Engine", "Closes the rear face of the visible engine assembly."),
            ("headlight_left_housing", "Left Headlight Housing", "Lighting", "Supports the left headlight optical components."),
            ("headlight_left_emitters", "Left Headlight Emitters", "Lighting", "Represent the light-producing elements of the left headlight."),
            ("headlight_left_lens", "Left Headlight Lens", "Lighting", "Covers and protects the left headlight optics."),
            ("headlight_right_housing", "Right Headlight Housing", "Lighting", "Supports the right headlight optical components."),
            ("headlight_right_emitters", "Right Headlight Emitters", "Lighting", "Represent the light-producing elements of the right headlight."),
            ("headlight_right_lens", "Right Headlight Lens", "Lighting", "Covers and protects the right headlight optics."),
            ("taillight_left_housing", "Left Taillight Housing", "Lighting", "Supports the left taillight optical components."),
            ("taillight_left_emitters", "Left Taillight Emitters", "Lighting", "Represent the light-producing elements of the left taillight."),
            ("taillight_left_lens", "Left Taillight Lens", "Lighting", "Covers and protects the left taillight optics."),
            ("taillight_right_housing", "Right Taillight Housing", "Lighting", "Supports the right taillight optical components."),
            ("taillight_right_emitters", "Right Taillight Emitters", "Lighting", "Represent the light-producing elements of the right taillight."),
            ("taillight_right_lens", "Right Taillight Lens", "Lighting", "Covers and protects the right taillight optics."),
            ("high_mounted_stop_light", "High-Mounted Stop Light", "Lighting", "Signals braking from the upper rear body area."),
            ("rear_lower_center_light", "Rear Lower Centre Light", "Lighting", "Represents the lower central rear signal light."),
        ]

        car_parts = {}
        for brand_name, car in cars.items():
            part_data = audi_part_data if brand_name == "Audi" else standard_part_data
            for component_id, name, category_name, function in part_data:
                part, _ = CarPart.objects.update_or_create(
                    car=car,
                    component_id=component_id,
                    defaults={
                        "category": categories[category_name],
                        "name": name,
                        "description": f"{name} component for {car}.",
                        "function": function,
                        "image_url": (
                            "https://placehold.co/800x600?text="
                            f"{brand_name.replace(' ', '+')}+{name.replace(' ', '+')}"
                        ),
                    },
                )
                car_parts[(brand_name, component_id)] = part

            if brand_name == "Audi":
                valid_component_ids = [row[0] for row in audi_part_data]
                CarPart.objects.filter(car=car).exclude(
                    component_id__in=valid_component_ids
                ).delete()

        return car_parts

    def create_part_details(self, cars, car_parts):
        specs = {
            "engine": [
                ("Type", "Turbocharged petrol"),
                ("Displacement", "3.0 L"),
                ("Power", "Development sample"),
                ("Torque", "Development sample"),
            ],
            "transmission": [("Type", "Automatic"), ("Gears", "8")],
            "front_brakes": [("Type", "Ventilated disc"), ("Position", "Front")],
            "rear_brakes": [("Type", "Ventilated disc"), ("Position", "Rear")],
            "radiator": [("Material", "Aluminium"), ("Cooling", "Liquid")],
            "battery": [("Voltage", "12 V"), ("Type", "Automotive battery")],
            "exhaust": [("Material", "Stainless steel")],
            "front_suspension": [("Position", "Front")],
            "rear_suspension": [("Position", "Rear")],
        }

        source_urls = {
            "BMW": "https://www.bmw.com/",
            "Toyota": "https://www.toyota.com/",
            "Mercedes-Benz": "https://www.mercedes-benz.com/",
            "Audi": "https://www.audi.com/",
        }

        for brand_name in cars:
            for component_id, values in specs.items():
                car_part = car_parts.get((brand_name, component_id))
                if not car_part:
                    continue
                for name, value in values:
                    PartSpecification.objects.update_or_create(
                        car_part=car_part,
                        name=name,
                        defaults={"value": value},
                    )

            engine = car_parts.get((brand_name, "engine")) or car_parts.get(
                (brand_name, "engine_block")
            )
            for related_id in ("radiator", "exhaust", "transmission"):
                related_part = car_parts.get((brand_name, related_id))
                if not engine or not related_part:
                    continue
                RelatedCarPart.objects.get_or_create(
                    car_part=engine,
                    related_part=related_part,
                )

            for component_id in ("engine", "engine_block", "radiator"):
                car_part = car_parts.get((brand_name, component_id))
                if not car_part:
                    continue
                PartSource.objects.update_or_create(
                    car_part=car_part,
                    title=f"{brand_name} official website",
                    defaults={"url": source_urls[brand_name]},
                )

    def create_spare_parts(self, cars, car_parts):
        part_brands = {
            "Bosch": ("https://www.bosch.com/", "https://placehold.co/300x120?text=Bosch"),
            "Brembo": (
                "https://www.brembo.com/",
                "https://placehold.co/300x120?text=Brembo",
            ),
            "Denso": ("https://www.denso.com/", "https://placehold.co/300x120?text=Denso"),
        }
        brand_objects = {}
        for name, (website_url, logo_url) in part_brands.items():
            brand, _ = PartBrand.objects.update_or_create(
                name=name,
                defaults={"website_url": website_url, "logo_url": logo_url},
            )
            brand_objects[name] = brand

        category_data = {
            "Engine Parts": "Replacement parts for engine systems.",
            "Brake Parts": "Replacement parts for brake systems.",
            "Cooling Parts": "Replacement parts for cooling systems.",
            "Electrical Parts": "Replacement parts for electrical systems.",
        }
        category_objects = {}
        for name, description in category_data.items():
            category, _ = ProductCategory.objects.update_or_create(
                name=name,
                defaults={"description": description},
            )
            category_objects[name] = category

        spare_part_templates = [
            ("Bosch", "Engine Parts", "engine", "Engine Air Filter", "AIR", "OEM-AIR"),
            ("Brembo", "Brake Parts", "front_brakes", "Front Brake Pad Set", "PAD", "OEM-PAD"),
            ("Denso", "Cooling Parts", "radiator", "Engine Radiator", "RAD", "OEM-RAD"),
        ]

        for brand_name, car in cars.items():
            brand_code = brand_name.upper().replace("-", "").replace(" ", "")[:4]
            for maker, category, component_id, name, sku_code, oem_code in spare_part_templates:
                car_part = car_parts.get((brand_name, component_id))
                if not car_part:
                    continue
                sku = f"{maker.upper()}-{brand_code}-{sku_code}"
                spare_part, _ = SparePart.objects.update_or_create(
                    sku=sku,
                    defaults={
                        "brand": brand_objects[maker],
                        "category": category_objects[category],
                        "car_part": car_part,
                        "name": f"{name} for {car.car_model}",
                        "oem_number": f"{oem_code}-{brand_code}",
                        "description": "Development catalog item without price or stock data.",
                    },
                )
                image_url = f"https://placehold.co/800x600?text={sku}"
                SparePartImage.objects.get_or_create(
                    spare_part=spare_part,
                    image_url=image_url,
                )
                PartCompatibility.objects.get_or_create(
                    spare_part=spare_part,
                    car=car,
                )
