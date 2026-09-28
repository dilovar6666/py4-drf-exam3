import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve(process.argv[2] || 'audi-r8/Audi R8 OBJ.obj');
const materialPath = path.resolve(process.argv[3] || 'audi-r8/Aydi R8 OBJ.mtl');

class DisjointSet {
  constructor(size) {
    this.parent = new Int32Array(size + 1);
    this.rank = new Uint8Array(size + 1);
    for (let index = 0; index <= size; index += 1) this.parent[index] = index;
  }

  find(value) {
    let root = value;
    while (this.parent[root] !== root) root = this.parent[root];
    while (this.parent[value] !== value) {
      const parent = this.parent[value];
      this.parent[value] = root;
      value = parent;
    }
    return root;
  }

  union(left, right) {
    let leftRoot = this.find(left);
    let rightRoot = this.find(right);
    if (leftRoot === rightRoot) return;
    if (this.rank[leftRoot] < this.rank[rightRoot]) [leftRoot, rightRoot] = [rightRoot, leftRoot];
    this.parent[rightRoot] = leftRoot;
    if (this.rank[leftRoot] === this.rank[rightRoot]) this.rank[leftRoot] += 1;
  }
}

function emptyBounds() {
  return { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
}

function includePoint(bounds, point) {
  for (let axis = 0; axis < 3; axis += 1) {
    bounds.min[axis] = Math.min(bounds.min[axis], point[axis]);
    bounds.max[axis] = Math.max(bounds.max[axis], point[axis]);
  }
}

function finishBounds(bounds) {
  const size = bounds.max.map((value, axis) => value - bounds.min[axis]);
  return {
    min: bounds.min.map((value) => Number(value.toFixed(4))),
    max: bounds.max.map((value) => Number(value.toFixed(4))),
    size: size.map((value) => Number(value.toFixed(4))),
    center: bounds.min.map((value, axis) => Number((value + size[axis] / 2).toFixed(4)))
  };
}

const source = fs.readFileSync(sourcePath, 'utf8');
const lines = source.split(/\r?\n/);
const vertexCount = lines.reduce((count, line) => count + (line.startsWith('v ') ? 1 : 0), 0);
const positions = new Float64Array((vertexCount + 1) * 3);
const disjointSet = new DisjointSet(vertexCount);
const referencedVertices = new Set();
const globalBounds = emptyBounds();
const groups = [];
let group = null;
let vertexIndex = 0;
let textureCoordinateCount = 0;
let normalCount = 0;
let faceCount = 0;
let triangleCount = 0;
let materialReferenceCount = 0;
let materialLibrary = null;

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (line.startsWith('v ')) {
    vertexIndex += 1;
    const point = line.slice(2).trim().split(/\s+/).slice(0, 3).map(Number);
    const offset = vertexIndex * 3;
    positions[offset] = point[0];
    positions[offset + 1] = point[1];
    positions[offset + 2] = point[2];
    includePoint(globalBounds, point);
    continue;
  }
  if (line.startsWith('vt ')) {
    textureCoordinateCount += 1;
    continue;
  }
  if (line.startsWith('vn ')) {
    normalCount += 1;
    continue;
  }
  if (line.startsWith('mtllib ')) {
    materialLibrary = line.slice(7).trim();
    continue;
  }
  if (line.startsWith('usemtl ')) {
    materialReferenceCount += 1;
    continue;
  }
  if (line.startsWith('g ')) {
    group = {
      name: line.slice(2).trim(),
      faces: 0,
      triangles: 0,
      vertexIndices: new Set(),
      bounds: emptyBounds()
    };
    groups.push(group);
    continue;
  }
  if (!line.startsWith('f ')) continue;

  if (!group) {
    group = { name: '[ungrouped]', faces: 0, triangles: 0, vertexIndices: new Set(), bounds: emptyBounds() };
    groups.push(group);
  }
  const indices = line.slice(2).trim().split(/\s+/).map((token) => {
    const value = Number(token.split('/')[0]);
    return value < 0 ? vertexIndex + value + 1 : value;
  });
  faceCount += 1;
  triangleCount += Math.max(0, indices.length - 2);
  group.faces += 1;
  group.triangles += Math.max(0, indices.length - 2);
  const first = indices[0];
  for (const index of indices) {
    if (!Number.isInteger(index) || index < 1 || index > vertexCount) continue;
    referencedVertices.add(index);
    group.vertexIndices.add(index);
    disjointSet.union(first, index);
  }
}

for (const currentGroup of groups) {
  for (const index of currentGroup.vertexIndices) {
    const offset = index * 3;
    includePoint(currentGroup.bounds, [positions[offset], positions[offset + 1], positions[offset + 2]]);
  }
}

const connectedRoots = new Set([...referencedVertices].map((index) => disjointSet.find(index)));
const materialSource = fs.readFileSync(materialPath, 'utf8');
const materialLines = materialSource.split(/\r?\n/).map((line) => line.trim());
const materialDeclarations = materialLines.filter((line) => line.startsWith('newmtl ')).map((line) => line.slice(7));
const textureReferences = materialLines.filter((line) => /^(map_|bump\b|disp\b|decal\b)/i.test(line));

const report = {
  source: {
    obj: sourcePath,
    mtl: materialPath,
    objBytes: fs.statSync(sourcePath).size,
    mtlBytes: fs.statSync(materialPath).size,
    materialLibrary,
    materialAssignments: materialReferenceCount,
    textureReferences
  },
  geometry: {
    vertices: vertexCount,
    referencedVertices: referencedVertices.size,
    textureCoordinates: textureCoordinateCount,
    normals: normalCount,
    faces: faceCount,
    triangulatedPolygons: triangleCount,
    groups: groups.length,
    connectedParts: connectedRoots.size,
    bounds: finishBounds(globalBounds)
  },
  materials: {
    declarations: materialDeclarations.length,
    unique: new Set(materialDeclarations).size,
    names: [...new Set(materialDeclarations)].sort()
  },
  groups: groups.map((currentGroup) => ({
    name: currentGroup.name,
    faces: currentGroup.faces,
    triangles: currentGroup.triangles,
    vertices: currentGroup.vertexIndices.size,
    connectedParts: new Set([...currentGroup.vertexIndices].map((index) => disjointSet.find(index))).size,
    bounds: finishBounds(currentGroup.bounds)
  }))
};

console.log(JSON.stringify(report, null, 2));
