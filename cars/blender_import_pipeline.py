"""Blender background worker: inventory, split only disconnected islands, export GLB."""
import json
import re
import sys
from pathlib import Path

import bpy


def arguments():
    args = sys.argv[sys.argv.index("--") + 1:]
    return json.loads(Path(args[0]).read_text(encoding="utf-8"))


def slug(value):
    result = re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")
    return (result or "unknown")[:76]


def category(name):
    normalized = name.lower()
    patterns = {
        "BODY": ["body", "hood", "bonnet", "door", "fender", "bumper", "roof", "trunk", "grille", "spoiler", "mirror", "skirt", "panel"],
        "GLASS": ["glass", "window", "windshield", "windscreen", "glazing"],
        "LIGHTING": ["light", "lamp", "headlamp", "headlight", "indicator", "taillight", "tail light"],
        "WHEELS": ["wheel", "tire", "tyre", "rim", "hub"],
        "BRAKES": ["brake", "caliper", "disc", "rotor", "drum"],
        "EXHAUST": ["exhaust", "muffler", "silencer", "tailpipe"],
        "ENGINE": ["engine", "motor", "intake", "radiator", "manifold", "piston"],
        "DRIVETRAIN": ["transmission", "gearbox", "differential", "driveshaft", "axle"],
        "SUSPENSION": ["suspension", "shock", "spring", "control arm", "wishbone"],
        "INTERIOR": ["interior", "seat", "steering", "dashboard", "console", "pedal", "carpet", "door card", "shifter"],
        "CHASSIS": ["chassis", "frame", "subframe", "floor", "underbody"],
    }
    matches = [key for key, words in patterns.items() if any(word in normalized for word in words)]
    return (matches[0], "MEDIUM") if len(matches) == 1 else ("UNKNOWN", "UNKNOWN")


def open_source(source):
    extension = Path(source).suffix.lower()
    if extension == ".blend":
        bpy.ops.wm.open_mainfile(filepath=source)
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        if extension in (".glb", ".gltf"):
            bpy.ops.import_scene.gltf(filepath=source)
        elif extension == ".fbx":
            bpy.ops.import_scene.fbx(filepath=source)
        else:
            raise RuntimeError("Unsupported source format")


def inventory(objects):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    rows, triangle_total = [], 0
    for obj in objects:
        mesh = obj.data if obj.type == "MESH" else None
        triangles = 0
        points = []
        if mesh:
            mesh.calc_loop_triangles()
            triangles = len(mesh.loop_triangles)
            triangle_total += triangles
            points = [obj.matrix_world @ vertex.co for vertex in mesh.vertices]
        if points:
            bounds = [[min(p[i] for p in points), max(p[i] for p in points)] for i in range(3)]
            dimensions = [round(pair[1] - pair[0], 6) for pair in bounds]
            center = [round((pair[0] + pair[1]) / 2, 6) for pair in bounds]
        else:
            bounds, dimensions, center = [], [], []
        evaluated = obj.evaluated_get(depsgraph)
        collections = []
        for collection in obj.users_collection:
            path = [collection.name]
            current = collection
            while True:
                parent = next((candidate for candidate in bpy.data.collections if candidate.children.get(current.name)), None)
                if not parent:
                    break
                path.insert(0, parent.name)
                current = parent
            collections.extend(path)
        rows.append({
            "name": obj.name, "type": obj.type, "mesh_data": mesh.name if mesh else None,
            "linked_data_users": mesh.users if mesh else (obj.data.users if obj.data else 0),
            "instance_type": obj.instance_type,
            "instance_collection": obj.instance_collection.name if obj.instance_collection else None,
            "collections": sorted(set(collections)),
            "parent": obj.parent.name if obj.parent else None,
            "children": [child.name for child in obj.children],
            "hidden_viewport": obj.hide_viewport or obj.hide_get(),
            "hidden_render": obj.hide_render,
            "vertices": len(mesh.vertices) if mesh else 0, "edges": len(mesh.edges) if mesh else 0,
            "faces": len(mesh.polygons) if mesh else 0, "triangles": triangles,
            "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
            "vertex_groups": [group.name for group in obj.vertex_groups],
            "modifiers": [{"name": modifier.name, "type": modifier.type, "show_viewport": modifier.show_viewport, "show_render": modifier.show_render} for modifier in obj.modifiers],
            "bounds": bounds, "center": center, "dimensions": dimensions,
            "evaluated_type": evaluated.type,
        })
    return rows, triangle_total


def ensure_all_objects_visible():
    scene = bpy.context.scene
    for collection in bpy.data.collections:
        collection.hide_viewport = False
        collection.hide_render = False
    for layer in bpy.context.view_layer.layer_collection.children:
        layer.exclude = False
        layer.hide_viewport = False
    for obj in bpy.data.objects:
        if not obj.users_collection:
            scene.collection.objects.link(obj)
        obj.hide_viewport = False
        obj.hide_render = False
        obj.hide_set(False)
        obj.select_set(False)


def separate_islands(obj):
    if obj.type != "MESH" or not obj.data.vertices or not obj.data.polygons:
        return [obj]
    if obj.data.users > 1:
        obj.data = obj.data.copy()
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    return [candidate for candidate in bpy.context.scene.objects if candidate.type == "MESH" and candidate.select_get()]


def run():
    config = arguments()
    source = str(Path(config["source"]).resolve())
    output = str(Path(config["output"]).resolve())
    manifest_path = str(Path(config["manifest"]).resolve())
    reviewed = config.get("review_manifest")
    open_source(source)
    source_objects = list(bpy.data.objects)
    inventory_rows, source_triangles = inventory(source_objects)
    ensure_all_objects_visible()
    scene = bpy.context.scene
    components = []
    counter = 0
    if reviewed:
        reviewed_by_source = {}
        for row in reviewed:
            for source_key in row.get("source_keys", []):
                reviewed_by_source[source_key] = row
    else:
        reviewed_by_source = {}

    island_number = {}
    for obj in list(source_objects):
        if obj.type != "MESH" or not obj.data.polygons:
            continue
        source_name = obj.name
        islands = separate_islands(obj)
        for island in islands:
            island_number[source_name] = island_number.get(source_name, 0) + 1
            island_index = island_number[source_name]
            counter += 1
            source_key = f"{source_name}::{island_index}"
            base_id = f"{slug(source_name)}_{island_index:02d}"
            row = reviewed_by_source.get(source_key)
            component_id = row.get("component_id", base_id) if row else base_id
            disabled = bool(row.get("disabled")) if row else False
            category_name, confidence = category(source_name)
            if row:
                category_name = row.get("category", category_name)
                confidence = row.get("confidence", confidence)
                display_name = row.get("name", source_name)
            else:
                display_name = source_name
            island.name = f"AA_DECORATIVE_{component_id}" if disabled else f"AA_{component_id}"
            island["componentId"] = component_id if not disabled else ""
            island.data.name = island.name + "_mesh"
            island.data.calc_loop_triangles()
            points = [island.matrix_world @ vertex.co for vertex in island.data.vertices]
            bounds = [[min(point[axis] for point in points), max(point[axis] for point in points)] for axis in range(3)] if points else []
            dimensions = [round(value[1] - value[0], 6) for value in bounds] if bounds else []
            center = [round((value[1] + value[0]) / 2, 6) for value in bounds] if bounds else []
            components.append({
                "component_id": component_id, "name": display_name,
                "category": category_name, "confidence": confidence,
                "source_objects": [source_name], "source_nodes": [island.name],
                "source_keys": [source_key],
                "vertices": len(island.data.vertices), "faces": len(island.data.polygons),
                "triangles": len(island.data.loop_triangles), "disabled": disabled,
                "geometry_islands": 1, "bounds": bounds, "center": center,
                "dimensions": dimensions,
                "materials": [slot.material.name if slot.material else None for slot in island.material_slots],
                "reason": "Disconnected source geometry island" if len(islands) > 1 else "Source object retained intact; no arbitrary cuts applied",
            })
            island.select_set(not disabled)

    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.data.objects:
        if obj.type == "MESH" and (obj.name.startswith("AA_") or obj.name.startswith("AA_DECORATIVE_")):
            obj.select_set(True)
    bpy.context.view_layer.objects.active = next((obj for obj in bpy.context.selected_objects), None)
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=output, export_format="GLB", use_selection=True, export_apply=False, export_yup=True, export_materials="EXPORT", export_image_format="AUTO", export_extras=True)
    export_objects = [item for item in components if not item["disabled"]]
    export_triangles = sum(item["triangles"] for item in export_objects)
    global_dimensions = [0, 0, 0]
    mesh_rows = [row for row in inventory_rows if row["type"] == "MESH"]
    for axis in range(3):
        lows = [row["bounds"][axis][0] for row in mesh_rows if len(row["bounds"]) == 3]
        highs = [row["bounds"][axis][1] for row in mesh_rows if len(row["bounds"]) == 3]
        global_dimensions[axis] = max(highs) - min(lows) if lows and highs else 0
    total_triangles = max(source_triangles, 1)
    ordered_components = sorted(components, key=lambda item: (item["triangles"], item.get("dimensions", [0, 0, 0])[0] * item.get("dimensions", [0, 0, 0])[1] * item.get("dimensions", [0, 0, 0])[2]), reverse=True)
    for item in ordered_components:
        item["triangle_share"] = round(item["triangles"] / total_triangles, 5)
        item["suspicious_flags"] = []
        if item["triangle_share"] > 0.05:
            item["suspicious_flags"].append("triangle_share_over_5_percent")
        if any(global_dimensions[i] and item["dimensions"][i] / global_dimensions[i] > 0.8 for i in range(3)):
            item["suspicious_flags"].append("bounding_box_spans_most_of_vehicle")
    report = {
        "source_file": Path(source).name,
        "source_format": Path(source).suffix.lower(),
        "object_count": len(source_objects),
        "mesh_object_count": sum(1 for row in inventory_rows if row["type"] == "MESH"),
        "object_types": {kind: sum(1 for row in inventory_rows if row["type"] == kind) for kind in sorted({row["type"] for row in inventory_rows})},
        "triangle_count": source_triangles,
        "vehicle_dimensions": [round(value, 6) for value in global_dimensions],
        "collections": sorted({name for row in inventory_rows for name in row["collections"]}),
        "hidden_objects": [row["name"] for row in inventory_rows if row["hidden_viewport"] or row["hidden_render"]],
        "objects": inventory_rows,
        "component_count": len(export_objects),
        "exported_triangle_count": export_triangles,
        "materials": sorted({mat for obj in bpy.data.objects if obj.type == "MESH" for mat in [slot.material.name for slot in obj.material_slots if slot.material]}),
        "largest_meshes_by_triangles": sorted(mesh_rows, key=lambda row: row["triangles"], reverse=True)[:20],
        "second_decomposition_pass": [{"component_id": item["component_id"], "triangles": item["triangles"], "connected_face_islands_after_safe_separation": 1, "decision": "Retained as one connected source region; no arbitrary surface cuts."} for item in ordered_components[:20]],
        "third_suspicious_mesh_pass": [{"component_id": item["component_id"], "flags": item["suspicious_flags"]} for item in ordered_components if item["suspicious_flags"]],
        "fused_or_not_safely_separable": [{"source_object": item["source_objects"][0], "component_id": item["component_id"], "triangles": item["triangles"], "note": "Large connected source region requires semantic human review; the pipeline does not cut continuous topology."} for item in ordered_components if item["triangle_share"] > 0.15],
    }
    Path(manifest_path).write_text(json.dumps(components, ensure_ascii=False, indent=2), encoding="utf-8")
    Path(config["report"]).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


run()
