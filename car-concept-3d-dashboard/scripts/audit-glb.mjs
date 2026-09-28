import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve(process.argv[2] || 'CarConcept.glb');
const includeMeshBounds = process.argv.includes('--include-mesh-bounds');
const buffer = fs.readFileSync(filePath);
const header = {
  magic: buffer.length >= 4 ? buffer.toString('ascii', 0, 4) : null,
  version: buffer.length >= 8 ? buffer.readUInt32LE(4) : null,
  declaredBytes: buffer.length >= 12 ? buffer.readUInt32LE(8) : null
};
header.valid = header.magic === 'glTF' && header.version === 2 && header.declaredBytes === buffer.length;
if (!header.valid) throw new Error(`${filePath} does not have a valid GLB 2.0 header.`);
let offset = 12;
let gltf = null;
let binaryChunk = null;

while (offset < buffer.length) {
  const length = buffer.readUInt32LE(offset);
  const type = buffer.readUInt32LE(offset + 4);
  const start = offset + 8;
  const end = start + length;
  if (type === 0x4e4f534a) {
    gltf = JSON.parse(buffer.subarray(start, end).toString('utf8').replace(/\0+$/, ''));
  } else if (type === 0x004e4942) {
    binaryChunk = { start, length };
  }
  offset = end;
}

if (!gltf) throw new Error(`${filePath} does not contain a JSON glTF chunk.`);

const accessors = gltf.accessors || [];
const bufferViews = gltf.bufferViews || [];
let primitiveCount = 0;
let uniquePrimitiveTriangles = 0;
let vertexEntries = 0;
let runtimeDrawsFromNodes = 0;
let runtimeTrianglesFromNodes = 0;
const meshTriangles = [];

for (const [meshIndex, mesh] of (gltf.meshes || []).entries()) {
  let triangles = 0;
  for (const primitive of mesh.primitives || []) {
    primitiveCount += 1;
    const positions = accessors[primitive.attributes?.POSITION];
    const indices = accessors[primitive.indices];
    vertexEntries += positions?.count || 0;
    if (primitive.mode === undefined || primitive.mode === 4) {
      triangles += Math.floor((indices?.count || positions?.count || 0) / 3);
    }
  }
  meshTriangles[meshIndex] = triangles;
  uniquePrimitiveTriangles += triangles;
}

for (const node of gltf.nodes || []) {
  if (node.mesh === undefined) continue;
  runtimeDrawsFromNodes += gltf.meshes[node.mesh]?.primitives?.length || 0;
  runtimeTrianglesFromNodes += meshTriangles[node.mesh] || 0;
}

function pngDimensions(data) {
  if (data.length > 24 && data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71) {
    return [data.readUInt32BE(16), data.readUInt32BE(20)];
  }
  return null;
}

function jpegDimensions(data) {
  let cursor = 2;
  const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (cursor + 9 < data.length) {
    if (data[cursor] !== 0xff) {
      cursor += 1;
      continue;
    }
    const marker = data[cursor + 1];
    const length = data.readUInt16BE(cursor + 2);
    if (startOfFrame.has(marker)) return [data.readUInt16BE(cursor + 5), data.readUInt16BE(cursor + 7)];
    if (length < 2) break;
    cursor += 2 + length;
  }
  return null;
}

const images = (gltf.images || []).map((image, index) => {
  let data = null;
  if (image.bufferView !== undefined && binaryChunk) {
    const view = bufferViews[image.bufferView];
    const start = binaryChunk.start + (view.byteOffset || 0);
    data = buffer.subarray(start, start + view.byteLength);
  }
  const dimensions = data && (pngDimensions(data) || jpegDimensions(data));
  return {
    index,
    name: image.name || null,
    mimeType: image.mimeType || null,
    bytes: data?.length || null,
    width: dimensions?.[0] || null,
    height: dimensions?.[1] || null,
    externalUri: image.uri && !image.uri.startsWith('data:') ? image.uri : null
  };
});

const nodeNames = (gltf.nodes || []).map((node) => node.name).filter(Boolean);
const logicalGroups = nodeNames.filter((name) => name.startsWith('AA_')).sort();
const line01Nodes = nodeNames.filter((name) => name.toLowerCase() === 'line01');

const identityMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function multiplyMatrices(a, b) {
  const result = new Array(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let index = 0; index < 4; index += 1) {
        result[column * 4 + row] += a[index * 4 + row] * b[column * 4 + index];
      }
    }
  }
  return result;
}

function nodeMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  return [
    (1 - 2 * y * y - 2 * z * z) * sx, (2 * x * y + 2 * z * w) * sx, (2 * x * z - 2 * y * w) * sx, 0,
    (2 * x * y - 2 * z * w) * sy, (1 - 2 * x * x - 2 * z * z) * sy, (2 * y * z + 2 * x * w) * sy, 0,
    (2 * x * z + 2 * y * w) * sz, (2 * y * z - 2 * x * w) * sz, (1 - 2 * x * x - 2 * y * y) * sz, 0,
    tx, ty, tz, 1
  ];
}

function transformPoint(matrix, point) {
  return [
    matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12],
    matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13],
    matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14]
  ];
}

const worldMatrices = new Map();
function visitNode(nodeIndex, parentMatrix = identityMatrix) {
  const node = gltf.nodes[nodeIndex];
  const worldMatrix = multiplyMatrices(parentMatrix, nodeMatrix(node));
  worldMatrices.set(nodeIndex, worldMatrix);
  for (const childIndex of node.children || []) visitNode(childIndex, worldMatrix);
}
for (const scene of gltf.scenes || []) {
  for (const nodeIndex of scene.nodes || []) visitNode(nodeIndex);
}

function descendantMeshBounds(rootIndex) {
  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];
  let meshNodes = 0;
  const stack = [rootIndex];
  while (stack.length) {
    const nodeIndex = stack.pop();
    const node = gltf.nodes[nodeIndex];
    stack.push(...(node.children || []));
    if (node.mesh === undefined) continue;
    meshNodes += 1;
    const matrix = worldMatrices.get(nodeIndex);
    for (const primitive of gltf.meshes[node.mesh]?.primitives || []) {
      const position = accessors[primitive.attributes?.POSITION];
      if (!position?.min || !position?.max) continue;
      for (const x of [position.min[0], position.max[0]]) {
        for (const y of [position.min[1], position.max[1]]) {
          for (const z of [position.min[2], position.max[2]]) {
            const point = transformPoint(matrix, [x, y, z]);
            for (let axis = 0; axis < 3; axis += 1) {
              minimum[axis] = Math.min(minimum[axis], point[axis]);
              maximum[axis] = Math.max(maximum[axis], point[axis]);
            }
          }
        }
      }
    }
  }
  const center = minimum.map((value, axis) => (value + maximum[axis]) / 2);
  return { minimum, maximum, center, meshNodes };
}

const logicalGroupBounds = (gltf.nodes || []).flatMap((node, nodeIndex) => {
  if (!node.name?.startsWith('AA_')) return [];
  const bounds = descendantMeshBounds(nodeIndex);
  const matrix = worldMatrices.get(nodeIndex);
  const origin = matrix ? [matrix[12], matrix[13], matrix[14]] : null;
  const centerError = origin && Number.isFinite(bounds.center[0])
    ? Math.hypot(...bounds.center.map((value, axis) => value - origin[axis]))
    : null;
  return [{ name: node.name, origin, center: bounds.center, centerError, meshNodes: bounds.meshNodes }];
}).sort((a, b) => a.name.localeCompare(b.name));

const sourceMeshBounds = includeMeshBounds
  ? (gltf.nodes || []).flatMap((node, nodeIndex) => {
    if (node.mesh === undefined) return [];
    const bounds = descendantMeshBounds(nodeIndex);
    return [{
      name: node.name || `[node-${nodeIndex}]`,
      parent: (gltf.nodes || []).find((candidate) => candidate.children?.includes(nodeIndex))?.name || null,
      center: bounds.center,
      size: bounds.minimum.map((value, axis) => bounds.maximum[axis] - value),
      triangles: meshTriangles[node.mesh] || 0
    }];
  }).sort((a, b) => a.name.localeCompare(b.name))
  : undefined;

console.log(JSON.stringify({
  file: filePath,
  fileBytes: buffer.length,
  header,
  extensionsUsed: gltf.extensionsUsed || [],
  extensionsRequired: gltf.extensionsRequired || [],
  scenes: gltf.scenes?.length || 0,
  nodes: gltf.nodes?.length || 0,
  meshResources: gltf.meshes?.length || 0,
  primitives: primitiveCount,
  runtimeDrawsFromNodes,
  uniquePrimitiveTriangles,
  runtimeTrianglesFromNodes,
  vertexEntries,
  materials: gltf.materials?.length || 0,
  textures: gltf.textures?.length || 0,
  images,
  samplers: gltf.samplers?.length || 0,
  animations: gltf.animations?.length || 0,
  skins: gltf.skins?.length || 0,
  cameras: gltf.cameras?.length || 0,
  logicalGroups,
  logicalGroupBounds,
  ...(sourceMeshBounds ? { sourceMeshBounds } : {}),
  line01Nodes
}, null, 2));
