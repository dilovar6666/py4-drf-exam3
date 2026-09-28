"""Prepare the supplied Audi R8 OBJ for Auto Anatomy in Blender.

The script is deliberately conservative:

* OBJ groups become Blender objects; loose geometry islands are not split.
* presentation geometry is removed;
* source objects are parented to stable ``AA_<componentId>`` empties;
* a small deterministic Auto Anatomy PBR material set is used when the OBJ
  has no trustworthy material assignments;
* no decimation is applied without a separately reviewed Blender pass;
* the saved GLB header is verified after export.

Opening this real file in Blender's Text Editor and pressing Run Script performs
the final preparation and export. CLI users can still choose an explicit mode:

    blender --background --python tools/prepare_audi_r8.py -- --analysis-only
    blender --background --python tools/prepare_audi_r8.py -- --export
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
import tempfile
from collections import Counter
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


SCRIPT_NAME = "prepare_audi_r8.py"


def find_frontend_dir() -> Path:
    """Locate the frontend both from Blender CLI and Blender's Text Editor."""
    candidates: list[tuple[str, Path]] = []

    raw_file = globals().get("__file__")
    if raw_file:
        candidates.append(("__file__", Path(raw_file)))

    active_text = getattr(getattr(bpy.context, "space_data", None), "text", None)
    if active_text and active_text.filepath:
        candidates.append(("Blender active text", Path(bpy.path.abspath(active_text.filepath))))

    for text in bpy.data.texts:
        if text.filepath and (text.name == SCRIPT_NAME or Path(text.filepath).name == SCRIPT_NAME):
            candidates.append((f'Blender text "{text.name}"', Path(bpy.path.abspath(text.filepath))))

    configured_root = os.environ.get("AUTO_ANATOMY_FRONTEND_DIR")
    if configured_root:
        candidates.append(("AUTO_ANATOMY_FRONTEND_DIR", Path(configured_root)))

    if bpy.data.filepath:
        candidates.append(("current .blend directory", Path(bpy.data.filepath).parent))
    candidates.append(("Blender // directory", Path(bpy.path.abspath("//"))))
    candidates.append(("current working directory", Path.cwd()))

    checked: list[str] = []
    seen: set[Path] = set()
    for label, candidate in candidates:
        try:
            resolved = candidate.expanduser().resolve()
        except (OSError, RuntimeError):
            checked.append(f"- {label}: {candidate!s} (could not resolve)")
            continue
        if resolved in seen:
            continue
        seen.add(resolved)
        checked.append(f"- {label}: {resolved}")

        if resolved.is_file() and resolved.name == SCRIPT_NAME:
            root = resolved.parent.parent
            if (root / "tools" / SCRIPT_NAME).is_file():
                return root

        start = resolved if resolved.is_dir() else resolved.parent
        for directory in (start, *start.parents):
            if (directory / "tools" / SCRIPT_NAME).is_file() and (directory / "audi-r8").is_dir():
                return directory

    details = "\n".join(checked) or "- no path candidates were available"
    raise RuntimeError(
        "Could not locate the Auto Anatomy frontend directory.\n"
        "Open the real tools/prepare_audi_r8.py file in Blender's Text Editor "
        "or set AUTO_ANATOMY_FRONTEND_DIR before starting Blender.\n"
        f"Checked paths:\n{details}"
    )


FRONTEND_DIR = find_frontend_dir()
SOURCE_DIR = FRONTEND_DIR / "audi-r8"
OBJ_PATH = SOURCE_DIR / "Audi R8 OBJ.obj"
MTL_PATH = SOURCE_DIR / "Aydi R8 OBJ.mtl"
TEXTURE_DIR = SOURCE_DIR / "Audi R8 textures"
WORK_DIR = SOURCE_DIR / "work"
BLEND_PATH = WORK_DIR / "Audi_R8_AutoAnatomy.blend"
REPORT_PATH = WORK_DIR / "audi-r8-blender-report.json"
GLB_PATH = FRONTEND_DIR / "assets" / "models" / "AudiR8.glb"

BACKGROUND_GROUPS = {"Line01"}

COMPONENT_GROUPS = {
    "body_shell": {"The_body", "Front_edges"},
    "carbon_sideblades": {"Carbon"},
    "fuel_filler_door": {"Fuel_tank_cap"},
    "exterior_badges": {"Front_logo", "Rear_logo", "R8_letters", "Qattro_logo"},
    "rear_lower_trim": {"Rear_edges"},
    "front_grille": {"radiator_grill"},
    "front_license_plate": {"Front_plate"},
    "rear_license_plate": {"Rear_plate"},
    "wiper_left": {"Wiper__left"},
    "wiper_right": {"Wiper_right"},
    "underbody": {"Bottom"},
    "wheel_arch_liners": {"Wheel_hole_cover"},
    "rear_engine_cover": {"Luggage_carrier_cover"},
    "door_left": {"Left_door"},
    "door_trim_left": {"Left_door_interior_panel"},
    "door_right": {"Right_door"},
    "door_trim_right": {"Right_door_interior_panel"},
    "windshield": {"Front_windsield"},
    "rear_window": {"Rear_window"},
    "cabin_engine_partition_glass": {"Window_inside"},
    "side_window_left": {"Side_window_left"},
    "side_window_right": {"Side_window_right"},
    "interior_shell": {"Body_of_interior"},
    "dashboard": {"Car_dashboard", "Plane_under_dashboard"},
    "brake_pedal": {"Brake_pedal"},
    "clutch_pedal": {"Clutch_pedal"},
    "accelerator_pedal": {"Gas_pedal", "button_of_accelerator"},
    "air_vent_left": {"Left_grill_of_conditioning", "Roller_of_left_air_conditioning_grill"},
    "air_vent_center": {"Center_grill_of_conditioning", "Roller_of_center_air_conditioning_grill"},
    "air_vent_right": {"Right_grill_of_air_conditioning", "Roller_of_right_air_conditioninng_grill"},
    "center_tunnel": {"Gearbox"},
    "cup_holder": {"Cup_holder"},
    "gear_shifter": {"Transmission_gear_shifter", "Grid_switching_speeds"},
    "infotainment_display": {"Computer", "Frame_of_computer"},
    "cd_player": {"CD_player"},
    "instrument_cluster": {"Cover_of_the_meters", "The_meters_cover_glass"},
    "dashboard_speaker_grille": {"grill_on_top_of_dashboard"},
    "rear_view_mirror": {"rear-view_mirror"},
    "seats": {"Seats"},
    "steering_wheel": {"Steer_-_driver_wheel"},
    "front_left_tire": {"Front_right_tire01"},
    "front_left_rim": {
        "Front_right_rim_01", "FRW_logo_on_rim01", "FRW_bolt01",
        "FRW_nipple_part_04", "FRW_nipple_part_05", "FRW_nipple_part_06",
    },
    "front_right_tire": {"Front_right_tire"},
    "front_right_rim": {
        "Front_right_rim_", "FRW_logo_on_rim", "FRW_bolt",
        "FRW_nipple_part_1", "FRW_nipple_part_2", "FRW_nipple_part_3",
    },
    "rear_left_tire": {"BRW_tire01"},
    "rear_left_rim": {
        "BRW_rim01", "BRW_rim_logo01", "BRW_nipple_cap01",
        "BRW_nipple_detail_03", "BRW_nipple_detail_04", "BRW_rim_bolts01",
    },
    "rear_right_tire": {"BRW_tire"},
    "rear_right_rim": {
        "BRW_rim", "BRW_rim_logo", "BRW_nipple_cap",
        "BRW_nipple_detail_2", "BRW_nipple_detail_1", "BRW_rim_bolts",
    },
    "front_left_brake_disc": {"FRW_brake_disk01"},
    "front_left_brake_caliper": {"FRW_brake_pad01", "FRW_brake_pad_detail_03", "FRW_brake_pad_detail_04"},
    "front_right_brake_disc": {"FRW_brake_disk"},
    "front_right_brake_caliper": {"FRW_brake_pad", "FRW_brake_pad_detail_1", "FRW_brake_pad_detail_2"},
    "rear_left_brake_disc": {"BRW_brake_disk01"},
    "rear_left_brake_caliper": {"BRW_brake_pad01", "BRW_brake_pad_detail_03", "BRW_brake_pad_detail_04"},
    "rear_right_brake_disc": {"BRW_brake_disk"},
    "rear_right_brake_caliper": {"BRW_brake_pad", "BRW_brake_pad_detail_1", "BRW_brake_pad_detail_2"},
    "engine_block": {
        "Engine_part_3", "Engine_part_2", "Engine_bolts", "Engine_part_1",
        "Engine_section", "Engine", "FSI_letters", "V8_letters",
    },
    "engine_cover_left": {"Engine_left_panel", "Cap_of_engine_left_panel"},
    "engine_cover_right": {"engine_right_panel", "Cap_of_engine_right_panel"},
    "engine_rear_panel": {"Engine_rear_panel"},
    "headlight_left_housing": {
        "FRHL_main_body01", "FRHL_Halogen_body01", "Halogen_lens_back_side_cover01",
        "FRHL_box01", "FRHL_R8_holder01", "FRHL_R8_letters01",
    },
    "headlight_left_lens": {"FRHL_Cover_glass01", "FRHL_halogen_lens01"},
    "headlight_left_emitters": {"FRHL_little_bulbs01", "FRHL_dimension_bulb_reflector01", "FRHL_dimension_bulb01"},
    "headlight_right_housing": {
        "FRHL_main_body", "FRHL_Halogen_body", "Halogen_lens_back_side_cover",
        "FRHL_box", "FRHL_R8_holder", "FRHL_R8_letters",
    },
    "headlight_right_lens": {"FRHL_Cover_glass", "FRHL_halogen_lens"},
    "headlight_right_emitters": {"FRHL_little_bulbs", "FRHL_dimension_bulb_reflector", "FRHL_dimension_bulb"},
    "taillight_left_housing": {"RRL_main_body01", "RRL_long_box01"},
    "taillight_left_lens": {"RRL_cover_glass01"},
    "taillight_left_emitters": {
        "RRL_Smaller_brake_bulb01", "RRL_bigger_brake_bulb01", "RRL_dimension_bulb01",
        "RRL_littele_bulbs_04", "RRL_little_bulbs_03", "RRL_little_bulbs_04",
    },
    "taillight_right_housing": {"RRL_main_body", "RRL_long_box"},
    "taillight_right_lens": {"RRL_cover_glass"},
    "taillight_right_emitters": {
        "RRL_Smaller_brake_bulb", "RRL_bigger_brake_bulb", "RRL_dimension_bulb",
        "RRL_littele_bulbs_3", "RRL_little_bulbs_1", "RRL_little_bulbs_2",
    },
    "high_mounted_stop_light": {"Stop_light_on_top", "Bulbs_of_stop_light_on_top"},
    "rear_lower_center_light": {"Bottom_stop_light"},
}

CATEGORY_COMPONENTS = {
    "BODY": {
        "body_shell", "carbon_sideblades", "fuel_filler_door", "exterior_badges",
        "rear_lower_trim", "front_grille", "front_license_plate", "rear_license_plate",
        "wiper_left", "wiper_right", "underbody", "wheel_arch_liners",
        "rear_engine_cover", "door_left", "door_trim_left", "door_right", "door_trim_right",
    },
    "GLASS": {
        "windshield", "rear_window", "cabin_engine_partition_glass",
        "side_window_left", "side_window_right",
    },
    "INTERIOR": {
        "interior_shell", "dashboard", "brake_pedal", "clutch_pedal", "accelerator_pedal",
        "air_vent_left", "air_vent_center", "air_vent_right", "center_tunnel", "cup_holder",
        "gear_shifter", "infotainment_display", "cd_player", "instrument_cluster",
        "dashboard_speaker_grille", "rear_view_mirror", "seats", "steering_wheel",
    },
    "WHEELS": {
        "front_left_tire", "front_left_rim", "front_right_tire", "front_right_rim",
        "rear_left_tire", "rear_left_rim", "rear_right_tire", "rear_right_rim",
    },
    "BRAKES": {
        "front_left_brake_disc", "front_left_brake_caliper",
        "front_right_brake_disc", "front_right_brake_caliper",
        "rear_left_brake_disc", "rear_left_brake_caliper",
        "rear_right_brake_disc", "rear_right_brake_caliper",
    },
    "ENGINE": {"engine_block", "engine_cover_left", "engine_cover_right", "engine_rear_panel"},
    "LIGHTING": {
        "headlight_left_housing", "headlight_left_lens", "headlight_left_emitters",
        "headlight_right_housing", "headlight_right_lens", "headlight_right_emitters",
        "taillight_left_housing", "taillight_left_lens", "taillight_left_emitters",
        "taillight_right_housing", "taillight_right_lens", "taillight_right_emitters",
        "high_mounted_stop_light", "rear_lower_center_light",
    },
}

COMPONENT_CATEGORIES = {
    component_id: category
    for category, component_ids in CATEGORY_COMPONENTS.items()
    for component_id in component_ids
}


def parse_args() -> argparse.Namespace:
    blender_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--analysis-only", action="store_true", help="Prepare and save the .blend, but do not export GLB.")
    mode.add_argument("--export", action="store_true", help="Export the production GLB after all safety checks pass.")
    parser.add_argument(
        "--allow-unassigned-materials",
        action="store_true",
        help="Explicitly permit a material-less preview export. Never use for the production switch.",
    )
    parser.add_argument("--vehicle-length", type=float, default=4.43, help="Target vehicle length in metres (default: 4.43).")
    args = parser.parse_args(blender_args)
    # Blender Text Editor / Run Script supplies no arguments. That is the
    # reviewed final workflow, so it prepares, saves and exports in one pass.
    if not args.analysis_only and not args.export:
        args.export = True
    return args


def audit_obj(path: Path) -> dict:
    counts = Counter()
    groups: list[str] = []
    material_libraries: list[str] = []
    assigned_materials: set[str] = set()
    with path.open("r", encoding="utf-8", errors="replace") as source:
        for line in source:
            if line.startswith("v "):
                counts["vertices"] += 1
            elif line.startswith("vt "):
                counts["texture_coordinates"] += 1
            elif line.startswith("vn "):
                counts["normals"] += 1
            elif line.startswith("f "):
                counts["faces"] += 1
                counts["triangles"] += max(0, len(line.split()) - 3)
            elif line.startswith("g "):
                name = line[2:].strip()
                if name and name not in groups:
                    groups.append(name)
            elif line.startswith("mtllib "):
                material_libraries.append(line[7:].strip())
            elif line.startswith("usemtl "):
                assigned_materials.add(line[7:].strip())
    return {
        **counts,
        "groups": groups,
        "material_libraries": material_libraries,
        "assigned_materials": sorted(assigned_materials),
    }


def audit_mtl(path: Path) -> dict:
    declarations: list[str] = []
    texture_references: list[str] = []
    with path.open("r", encoding="utf-8", errors="replace") as source:
        for raw_line in source:
            line = raw_line.strip()
            if line.startswith("newmtl "):
                declarations.append(line[7:].strip())
            elif re.match(r"^(map_|bump\b|disp\b|decal\b)", line, re.IGNORECASE):
                texture_references.append(line)
    return {
        "declarations": len(declarations),
        "unique_materials": len(set(declarations)),
        "duplicate_declarations": len(declarations) - len(set(declarations)),
        "texture_references": texture_references,
        "texture_directory": str(TEXTURE_DIR),
        "texture_directory_exists": TEXTURE_DIR.is_dir(),
        "texture_files": sorted(
            str(path.relative_to(TEXTURE_DIR))
            for path in TEXTURE_DIR.rglob("*")
            if path.is_file()
        ) if TEXTURE_DIR.is_dir() else [],
    }


def make_grouped_obj(source_path: Path, material_path: Path, destination_dir: Path) -> Path:
    """Create a temporary importer-only OBJ where semantic groups are objects."""
    destination = destination_dir / source_path.name
    shutil.copy2(material_path, destination_dir / material_path.name)
    has_mtllib = bool(audit_obj(source_path)["material_libraries"])
    with source_path.open("r", encoding="utf-8", errors="replace") as source, destination.open(
        "w", encoding="utf-8", newline="\n"
    ) as output:
        if not has_mtllib:
            output.write(f"mtllib {material_path.name}\n")
        for line in source:
            if line.startswith("g "):
                group_name = line[2:].strip()
                output.write(f"o {group_name}\n")
            output.write(line.rstrip("\r\n") + "\n")
    return destination


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(collection):
            if datablock.users == 0:
                collection.remove(datablock)


def import_obj(path: Path) -> None:
    if hasattr(bpy.ops.wm, "obj_import"):
        bpy.ops.wm.obj_import(filepath=str(path), use_split_objects=True, use_split_groups=False)
    else:
        bpy.ops.import_scene.obj(filepath=str(path), use_split_objects=True, use_split_groups=False)


def source_name(obj: bpy.types.Object) -> str:
    # Blender adds .001 only for duplicate datablock names; source group names do not contain it.
    return re.sub(r"\.\d{3}$", "", obj.name)


def component_for(name: str) -> str:
    for component_id, names in COMPONENT_GROUPS.items():
        if name in names:
            return component_id
    return "unmapped"


def bounds_for(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    if not points:
        return Vector((0, 0, 0)), Vector((0, 0, 0))
    return (
        Vector(tuple(min(point[axis] for point in points) for axis in range(3))),
        Vector(tuple(max(point[axis] for point in points) for axis in range(3))),
    )


def remove_background(meshes: list[bpy.types.Object]) -> list[bpy.types.Object]:
    kept = []
    for obj in meshes:
        if source_name(obj) in BACKGROUND_GROUPS:
            bpy.data.objects.remove(obj, do_unlink=True)
        else:
            kept.append(obj)
    return kept


def normalize_vehicle(meshes: list[bpy.types.Object], target_length: float) -> dict:
    minimum, maximum = bounds_for(meshes)
    source_size = maximum - minimum
    if source_size.z <= 0:
        raise RuntimeError("Cannot normalize Audi R8: source Z length is zero.")
    scale = target_length / source_size.z
    scale_matrix = Matrix.Scale(scale, 4)
    for obj in meshes:
        # Pre-multiplication scales geometry and object offsets around the scene origin,
        # regardless of how a Blender importer chose individual object origins.
        obj.matrix_world = scale_matrix @ obj.matrix_world
    bpy.context.view_layer.update()
    minimum, maximum = bounds_for(meshes)
    center = (minimum + maximum) * 0.5
    ground_shift = Vector((-center.x, -minimum.y, -center.z))
    for obj in meshes:
        obj.location += ground_shift
    bpy.context.view_layer.update()
    return {"uniform_scale": scale, "target_length_m": target_length}


def create_component_hierarchy(meshes: list[bpy.types.Object]) -> tuple[dict[str, list[str]], list[str]]:
    grouped: dict[str, list[bpy.types.Object]] = {}
    for obj in meshes:
        name = source_name(obj)
        grouped.setdefault(component_for(name), []).append(obj)

    root = bpy.data.objects.new("AA_AudiR8", None)
    bpy.context.scene.collection.objects.link(root)
    category_roots: dict[str, bpy.types.Object] = {}
    for category in sorted(CATEGORY_COMPONENTS):
        category_root = bpy.data.objects.new(f"AA_CATEGORY_{category}", None)
        category_root.empty_display_type = "PLAIN_AXES"
        category_root.empty_display_size = 0.12
        category_root.parent = root
        category_root["category"] = category
        bpy.context.scene.collection.objects.link(category_root)
        category_roots[category] = category_root
    report_groups: dict[str, list[str]] = {}
    for component_id, objects in sorted(grouped.items()):
        minimum, maximum = bounds_for(objects)
        original_center = (minimum + maximum) * 0.5
        world_matrices = [(obj, obj.matrix_world.copy()) for obj in objects]
        parent = bpy.data.objects.new(f"AA_{component_id}", None)
        parent.empty_display_type = "PLAIN_AXES"
        parent.empty_display_size = max(0.03, (maximum - minimum).length * 0.04)
        parent.location = original_center
        category = COMPONENT_CATEGORIES.get(component_id, "OTHER_MECHANICAL")
        if category not in category_roots:
            category_root = bpy.data.objects.new(f"AA_CATEGORY_{category}", None)
            category_root.parent = root
            category_root["category"] = category
            bpy.context.scene.collection.objects.link(category_root)
            category_roots[category] = category_root
        parent.parent = category_roots[category]
        parent["componentId"] = component_id
        parent["category"] = category
        bpy.context.scene.collection.objects.link(parent)
        # Blender GUI can defer dependency-graph updates. The parent world
        # matrix must be current before converting child transforms to local
        # space, otherwise the parent translation is applied twice in glTF.
        bpy.context.view_layer.update()
        for obj, matrix in world_matrices:
            obj.parent = parent
            obj.matrix_parent_inverse = Matrix.Identity(4)
            obj.matrix_world = matrix
            obj["componentId"] = component_id
            obj["sourceGroup"] = source_name(obj)
        bpy.context.view_layer.update()
        current_minimum, current_maximum = bounds_for(objects)
        current_center = (current_minimum + current_maximum) * 0.5
        center_error = (current_center - original_center).length
        if center_error > 0.00001:
            raise RuntimeError(
                f'Parenting changed world-space bounds for "{component_id}" '
                f"by {center_error:.8f}; export stopped."
            )
        report_groups[component_id] = sorted(source_name(obj) for obj in objects)
    return report_groups, report_groups.get("unmapped", [])


AUTO_MATERIAL_SPECS = {
    "body_paint": {
        # Cool Audi-style silver. glTF baseColorFactor is linear, so these
        # values render close to the sRGB #B8BCC0 reference under our HDR-like
        # Three.js environment without turning white or mirror-chrome.
        "color": (0.48, 0.50, 0.53, 1.0), "metallic": 0.82,
        "roughness": 0.23, "coat": 0.85, "coat_roughness": 0.12,
    },
    "carbon": {
        "color": (0.012, 0.015, 0.018, 1.0), "metallic": 0.18, "roughness": 0.3,
    },
    "glass": {
        "color": (0.018, 0.035, 0.055, 0.28), "roughness": 0.08,
        "transmission": 0.35, "ior": 1.45,
    },
    "tire": {
        "color": (0.008, 0.009, 0.01, 1.0), "roughness": 0.82,
    },
    "wheel_metal": {
        "color": (0.22, 0.24, 0.27, 1.0), "metallic": 0.92, "roughness": 0.2,
    },
    "brake_disc": {
        "color": (0.2, 0.21, 0.22, 1.0), "metallic": 0.96, "roughness": 0.3,
    },
    "brake_pad": {
        "color": (0.38, 0.018, 0.012, 1.0), "metallic": 0.52, "roughness": 0.34,
    },
    "light_glass": {
        "color": (0.68, 0.78, 0.86, 0.42), "roughness": 0.1, "ior": 1.45,
    },
    "light_front": {
        "color": (0.72, 0.82, 1.0, 1.0), "roughness": 0.2,
        "emission": (0.52, 0.68, 1.0, 1.0), "emission_strength": 0.45,
    },
    "light_rear": {
        "color": (0.5, 0.006, 0.012, 1.0), "roughness": 0.22,
        "emission": (0.65, 0.004, 0.008, 1.0), "emission_strength": 0.38,
    },
    "interior": {
        "color": (0.014, 0.015, 0.017, 1.0), "roughness": 0.58,
    },
    "seat": {
        "color": (0.032, 0.02, 0.018, 1.0), "roughness": 0.62,
        "coat": 0.16, "coat_roughness": 0.32,
    },
    "engine": {
        "color": (0.16, 0.17, 0.18, 1.0), "metallic": 0.82, "roughness": 0.34,
    },
    "trim": {
        "color": (0.022, 0.026, 0.03, 1.0), "metallic": 0.22, "roughness": 0.4,
    },
    "chrome": {
        "color": (0.55, 0.58, 0.62, 1.0), "metallic": 1.0, "roughness": 0.13,
    },
}

GLASS_GROUPS = {
    "Rear_window", "Front_windsield", "Window_inside", "The_meters_cover_glass",
    "Side_window_left", "Side_window_right",
}

TRIM_GROUPS = {
    "Bottom", "Front_edges", "Rear_edges", "Front_plate", "Rear_plate",
    "Wheel_hole_cover", "Wiper_right", "Wiper__left", "radiator_grill",
}


def set_principled_input(shader: bpy.types.Node, names: tuple[str, ...], value) -> None:
    for name in names:
        socket = shader.inputs.get(name)
        if socket is not None:
            socket.default_value = value
            return


def create_auto_material(role: str, spec: dict) -> bpy.types.Material:
    material = bpy.data.materials.new(name=f"AA_{role}")
    material.use_nodes = True
    material.diffuse_color = spec["color"]
    nodes = material.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    material.node_tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])

    set_principled_input(shader, ("Base Color",), spec["color"])
    set_principled_input(shader, ("Metallic",), spec.get("metallic", 0.0))
    set_principled_input(shader, ("Roughness",), spec.get("roughness", 0.5))
    set_principled_input(shader, ("IOR",), spec.get("ior", 1.5))
    set_principled_input(shader, ("Alpha",), spec["color"][3])
    set_principled_input(shader, ("Coat Weight", "Clearcoat"), spec.get("coat", 0.0))
    set_principled_input(shader, ("Coat Roughness", "Clearcoat Roughness"), spec.get("coat_roughness", 0.03))
    set_principled_input(shader, ("Transmission Weight", "Transmission"), spec.get("transmission", 0.0))
    set_principled_input(shader, ("Emission Color", "Emission"), spec.get("emission", (0.0, 0.0, 0.0, 1.0)))
    set_principled_input(shader, ("Emission Strength",), spec.get("emission_strength", 0.0))

    if spec["color"][3] < 1.0:
        material.use_backface_culling = False
        if hasattr(material, "surface_render_method"):
            for method in ("DITHERED", "BLENDED"):
                try:
                    material.surface_render_method = method
                    break
                except (TypeError, ValueError):
                    continue
        elif hasattr(material, "blend_method"):
            material.blend_method = "BLEND"
    return material


def material_role_for(source_group: str, component_id: str) -> str:
    lower = source_group.lower()
    category = COMPONENT_CATEGORIES.get(component_id)
    if source_group == "Carbon":
        return "carbon"
    if source_group in GLASS_GROUPS:
        return "glass"
    if category == "LIGHTING":
        if "cover_glass" in lower or "lens" in lower:
            return "light_glass"
        if source_group.startswith("RRL_") or "stop_light" in lower:
            return "light_rear"
        return "light_front"
    if "tire" in lower:
        return "tire"
    if category == "WHEELS":
        return "wheel_metal"
    if category == "BRAKES":
        return "brake_disc" if "disk" in lower else "brake_pad"
    if category == "ENGINE":
        return "engine"
    if component_id == "seats":
        return "seat"
    if category == "INTERIOR" or component_id.startswith("door_trim_") or "interior_panel" in lower:
        return "interior"
    if "logo" in lower or "letters" in lower:
        return "chrome"
    if source_group in TRIM_GROUPS:
        return "trim"
    return "body_paint"


def assign_auto_materials(meshes: list[bpy.types.Object]) -> dict:
    materials = {
        role: create_auto_material(role, spec)
        for role, spec in AUTO_MATERIAL_SPECS.items()
    }
    assignments: dict[str, list[str]] = {}
    for obj in meshes:
        group_name = source_name(obj)
        component_id = component_for(group_name)
        role = material_role_for(group_name, component_id)
        obj.data.materials.clear()
        obj.data.materials.append(materials[role])
        obj["materialRole"] = role
        assignments.setdefault(role, []).append(group_name)
    return {
        "strategy": "auto_anatomy_pbr",
        "original_materials_restored": False,
        "textures_used": [],
        "materials": sorted(material.name for material in materials.values()),
        "assignments": {role: sorted(names) for role, names in sorted(assignments.items())},
    }


def mesh_stats(meshes: list[bpy.types.Object]) -> dict:
    return {
        "mesh_count": len(meshes),
        "vertices": sum(len(obj.data.vertices) for obj in meshes),
        "polygons": sum(len(obj.data.polygons) for obj in meshes),
        "triangles": sum(len(poly.vertices) - 2 for obj in meshes for poly in obj.data.polygons),
        "material_slots": sum(len(obj.material_slots) for obj in meshes),
        "unique_materials": len({slot.material.name for obj in meshes for slot in obj.material_slots if slot.material}),
    }


def image_stats() -> dict:
    images = []
    missing = []
    for image in bpy.data.images:
        if image.source in {"GENERATED", "VIEWER"} or not image.filepath:
            continue
        resolved = Path(bpy.path.abspath(image.filepath)) if image.filepath else None
        record = {
            "name": image.name,
            "path": str(resolved) if resolved else None,
            "packed": bool(image.packed_file),
            "exists": bool(resolved and resolved.is_file()),
        }
        images.append(record)
        if not record["packed"] and not record["exists"]:
            missing.append(record)
    return {"images": images, "missing_images": missing}


def save_work_file() -> None:
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH), compress=True)


def export_glb() -> dict:
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
    kwargs = {
        "filepath": str(GLB_PATH),
        "export_format": "GLB",
        "use_selection": False,
        "export_apply": True,
        "export_materials": "EXPORT",
        "export_cameras": False,
        "export_lights": False,
        "export_extras": True,
    }
    supported = {prop.identifier for prop in bpy.ops.export_scene.gltf.get_rna_type().properties}
    bpy.ops.export_scene.gltf(**{key: value for key, value in kwargs.items() if key in supported})
    if not GLB_PATH.is_file() or GLB_PATH.stat().st_size < 20:
        raise RuntimeError(f"Blender did not create a usable GLB at {GLB_PATH}")
    with GLB_PATH.open("rb") as exported:
        if exported.read(4) != b"glTF":
            raise RuntimeError(f"Exported file does not have a GLB header: {GLB_PATH}")
    return {
        "path": str(GLB_PATH),
        "bytes": GLB_PATH.stat().st_size,
        "header_valid": True,
    }


def main() -> None:
    args = parse_args()
    required_paths = {
        "FRONTEND_DIR": (FRONTEND_DIR, "directory"),
        "SOURCE_DIR": (SOURCE_DIR, "directory"),
        "OBJ_PATH": (OBJ_PATH, "file"),
        "MTL_PATH": (MTL_PATH, "file"),
        "TEXTURE_DIR": (TEXTURE_DIR, "directory"),
    }
    missing = [
        f"- {name}: {path} (expected {kind})"
        for name, (path, kind) in required_paths.items()
        if (kind == "file" and not path.is_file()) or (kind == "directory" and not path.is_dir())
    ]
    if missing:
        resolved = "\n".join(f"- {name}: {path}" for name, (path, _) in required_paths.items())
        raise FileNotFoundError(
            "Audi R8 preparation paths are incomplete.\n"
            f"Missing or invalid:\n{'\n'.join(missing)}\n"
            f"Resolved paths:\n{resolved}"
        )

    source_audit = audit_obj(OBJ_PATH)
    material_audit = audit_mtl(MTL_PATH)
    material_safe = bool(source_audit["material_libraries"] and source_audit["assigned_materials"])

    clear_scene()
    with tempfile.TemporaryDirectory(prefix="auto-anatomy-audi-") as temp_dir:
        grouped_obj = make_grouped_obj(OBJ_PATH, MTL_PATH, Path(temp_dir))
        import_obj(grouped_obj)

    imported_meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    meshes = remove_background(imported_meshes)
    normalization = normalize_vehicle(meshes, args.vehicle_length)
    components, unmapped = create_component_hierarchy(meshes)
    material_result = assign_auto_materials(meshes) if not material_safe else {
        "strategy": "source_obj_mtl",
        "original_materials_restored": True,
        "textures_used": [],
    }
    stats = mesh_stats(meshes)
    images = image_stats()

    if args.export and stats["material_slots"] == 0 and not args.allow_unassigned_materials:
        raise RuntimeError(
            "Production export refused: Blender imported no material slots. "
            "Repair the OBJ material assignments and verify the MTL before exporting."
        )
    if args.export and images["missing_images"] and not args.allow_unassigned_materials:
        missing = ", ".join(image["name"] for image in images["missing_images"])
        raise RuntimeError(f"Production export refused: Blender could not resolve images: {missing}")

    report = {
        "source": str(OBJ_PATH),
        "source_bytes": OBJ_PATH.stat().st_size,
        "material_file": str(MTL_PATH),
        "material_file_bytes": MTL_PATH.stat().st_size,
        "material_safe": material_safe,
        "source_audit": source_audit,
        "material_audit": material_audit,
        "material_result": material_result,
        "removed_groups": sorted(BACKGROUND_GROUPS),
        "normalization": normalization,
        "components": components,
        "unmapped_groups": unmapped,
        "blender_stats": stats,
        "images": images,
        "decimation_applied": False,
        "glb_path": str(GLB_PATH) if args.export else None,
    }
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    save_work_file()
    if args.export:
        report["glb"] = export_glb()
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
