import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve(process.argv[2] || 'CarConcept.glb');
const buffer = fs.readFileSync(filePath);
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

console.log(JSON.stringify({
  file: filePath,
  fileBytes: buffer.length,
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
  cameras: gltf.cameras?.length || 0
}, null, 2));
