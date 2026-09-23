import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODELS_DIR = path.join(__dirname, "public", "models");

// ==========================================
// GLTF 2.0 Binary (GLB) Builder
// ==========================================
function buildGLB(parts) {
  let binBuffers = [];
  let bufferViews = [];
  let accessors = [];
  let meshes = [];
  let materials = [];
  let nodes = [];
  let totalByteOffset = 0;

  function addBuffer(typedArray, target) {
    const byteLength = typedArray.byteLength;
    const viewIndex = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset: totalByteOffset,
      byteLength: byteLength,
      target: target,
    });
    binBuffers.push(Buffer.from(typedArray.buffer, typedArray.byteOffset, byteLength));
    const pad = (4 - (byteLength % 4)) % 4;
    if (pad > 0) {
      binBuffers.push(Buffer.alloc(pad));
      totalByteOffset += byteLength + pad;
    } else {
      totalByteOffset += byteLength;
    }
    return viewIndex;
  }

  parts.forEach((p, idx) => {
    const matIdx = materials.length;
    materials.push({
      name: p.material.name || "mat_" + idx,
      pbrMetallicRoughness: {
        baseColorFactor: p.material.baseColor || [0.8, 0.8, 0.8, 1.0],
        metallicFactor: p.material.metallic ?? 0.1,
        roughnessFactor: p.material.roughness ?? 0.5,
      },
      doubleSided: true,
    });

    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.positions.length; i += 3) {
      min[0] = Math.min(min[0], p.positions[i]);
      min[1] = Math.min(min[1], p.positions[i + 1]);
      min[2] = Math.min(min[2], p.positions[i + 2]);
      max[0] = Math.max(max[0], p.positions[i]);
      max[1] = Math.max(max[1], p.positions[i + 1]);
      max[2] = Math.max(max[2], p.positions[i + 2]);
    }

    const posView = addBuffer(p.positions, 34962);
    const posAcc = accessors.length;
    accessors.push({
      bufferView: posView,
      byteOffset: 0,
      componentType: 5126,
      count: p.positions.length / 3,
      type: "VEC3",
      min,
      max,
    });

    const normView = addBuffer(p.normals, 34962);
    const normAcc = accessors.length;
    accessors.push({
      bufferView: normView,
      byteOffset: 0,
      componentType: 5126,
      count: p.normals.length / 3,
      type: "VEC3",
    });

    const indView = addBuffer(p.indices, 34963);
    const indAcc = accessors.length;
    accessors.push({
      bufferView: indView,
      byteOffset: 0,
      componentType: 5123,
      count: p.indices.length,
      type: "SCALAR",
    });

    const meshIdx = meshes.length;
    meshes.push({
      primitives: [
        {
          attributes: {
            POSITION: posAcc,
            NORMAL: normAcc,
          },
          indices: indAcc,
          material: matIdx,
        },
      ],
    });

    nodes.push({ mesh: meshIdx });
  });

  const binBuffer = Buffer.concat(binBuffers);
  const gltf = {
    asset: { version: "2.0", generator: "SmartInventoryAR-3DBuilder" },
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    scene: 0,
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: binBuffer.length }],
  };

  let jsonBuf = Buffer.from(JSON.stringify(gltf), "utf8");
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  if (jsonPad > 0) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);

  const totalLength = 12 + 8 + jsonBuf.length + 8 + binBuffer.length;
  const header = Buffer.alloc(12);
  header.write("glTF", 0, 4, "ascii");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuf.length, 0);
  jsonHeader.write("JSON", 4, 4, "ascii");

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binBuffer.length, 0);
  binHeader.write("BIN\0", 4, 4, "ascii");

  return Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuffer]);
}

// ==========================================
// 3D Geometry Helper Functions
// ==========================================
function createBox({ w = 1, h = 1, d = 1, ox = 0, oy = 0, oz = 0 }) {
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;

  // 6 faces * 4 vertices = 24 vertices
  const rawPos = [
    // Front
    -hw, -hh,  hd,   hw, -hh,  hd,   hw,  hh,  hd,  -hw,  hh,  hd,
    // Back
     hw, -hh, -hd,  -hw, -hh, -hd,  -hw,  hh, -hd,   hw,  hh, -hd,
    // Top
    -hw,  hh,  hd,   hw,  hh,  hd,   hw,  hh, -hd,  -hw,  hh, -hd,
    // Bottom
    -hw, -hh, -hd,   hw, -hh, -hd,   hw, -hh,  hd,  -hw, -hh,  hd,
    // Right
     hw, -hh,  hd,   hw, -hh, -hd,   hw,  hh, -hd,   hw,  hh,  hd,
    // Left
    -hw, -hh, -hd,  -hw, -hh,  hd,  -hw,  hh,  hd,  -hw,  hh, -hd,
  ];

  const rawNorm = [
    // Front
    0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
    // Back
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    // Top
    0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
    // Bottom
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    // Right
    1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
    // Left
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ];

  const rawInd = [];
  for (let f = 0; f < 6; f++) {
    const base = f * 4;
    rawInd.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  const positions = new Float32Array(rawPos.map((v, i) => v + (i % 3 === 0 ? ox : i % 3 === 1 ? oy : oz)));
  const normals = new Float32Array(rawNorm);
  const indices = new Uint16Array(rawInd);

  return { positions, normals, indices };
}

function createCylinder({ rTop = 0.5, rBottom = 0.5, height = 1, segments = 24, ox = 0, oy = 0, oz = 0 }) {
  const positions = [];
  const normals = [];
  const indices = [];

  const halfH = height / 2;

  // Body
  for (let y = 0; y <= 1; y++) {
    const vY = y === 0 ? -halfH : halfH;
    const radius = y === 0 ? rBottom : rTop;
    for (let s = 0; s <= segments; s++) {
      const u = s / segments;
      const angle = u * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      positions.push(cos * radius + ox, vY + oy, sin * radius + oz);
      normals.push(cos, 0, sin);
    }
  }

  const stride = segments + 1;
  for (let s = 0; s < segments; s++) {
    indices.push(s, s + stride, s + 1);
    indices.push(s + 1, s + stride, s + stride + 1);
  }

  // Top cap
  const topCenterIdx = positions.length / 3;
  positions.push(ox, halfH + oy, oz);
  normals.push(0, 1, 0);

  for (let s = 0; s <= segments; s++) {
    const angle = (s / segments) * Math.PI * 2;
    positions.push(Math.cos(angle) * rTop + ox, halfH + oy, Math.sin(angle) * rTop + oz);
    normals.push(0, 1, 0);
  }

  for (let s = 0; s < segments; s++) {
    indices.push(topCenterIdx, topCenterIdx + 1 + s, topCenterIdx + 2 + s);
  }

  // Bottom cap
  const bottomCenterIdx = positions.length / 3;
  positions.push(ox, -halfH + oy, oz);
  normals.push(0, -1, 0);

  for (let s = 0; s <= segments; s++) {
    const angle = (s / segments) * Math.PI * 2;
    positions.push(Math.cos(angle) * rBottom + ox, -halfH + oy, Math.sin(angle) * rBottom + oz);
    normals.push(0, -1, 0);
  }

  for (let s = 0; s < segments; s++) {
    indices.push(bottomCenterIdx, bottomCenterIdx + 2 + s, bottomCenterIdx + 1 + s);
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

function createTorusTube({ R = 0.5, r = 0.12, radialSegments = 24, tubularSegments = 32, ox = 0, oy = 0, oz = 0 }) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let j = 0; j <= radialSegments; j++) {
    const v = (j / radialSegments) * Math.PI * 2;
    const cosV = Math.cos(v);
    const sinV = Math.sin(v);

    for (let i = 0; i <= tubularSegments; i++) {
      const u = (i / tubularSegments) * Math.PI * 2;
      const cosU = Math.cos(u);
      const sinU = Math.sin(u);

      const x = (R + r * cosV) * cosU + ox;
      const y = r * sinV + oy;
      const z = (R + r * cosV) * sinU + oz;

      positions.push(x, y, z);

      const nx = cosV * cosU;
      const ny = sinV;
      const nz = cosV * sinU;
      normals.push(nx, ny, nz);
    }
  }

  for (let j = 1; j <= radialSegments; j++) {
    for (let i = 1; i <= tubularSegments; i++) {
      const a = (tubularSegments + 1) * j + i - 1;
      const b = (tubularSegments + 1) * (j - 1) + i - 1;
      const c = (tubularSegments + 1) * (j - 1) + i;
      const d = (tubularSegments + 1) * j + i;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

function createSphere({ radius = 0.5, widthSegments = 24, heightSegments = 16, ox = 0, oy = 0, oz = 0 }) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const theta = v * Math.PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const phi = u * Math.PI * 2;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const nx = cosPhi * sinTheta;
      const ny = cosTheta;
      const nz = sinPhi * sinTheta;

      positions.push(radius * nx + ox, radius * ny + oy, radius * nz + oz);
      normals.push(nx, ny, nz);
    }
  }

  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const first = y * (widthSegments + 1) + x;
      const second = first + widthSegments + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

function mergeGeometries(geoList) {
  let totalPos = 0;
  let totalInd = 0;
  geoList.forEach((g) => {
    totalPos += g.positions.length;
    totalInd += g.indices.length;
  });

  const positions = new Float32Array(totalPos);
  const normals = new Float32Array(totalPos);
  const indices = new Uint16Array(totalInd);

  let posOffset = 0;
  let indOffset = 0;
  let vertOffset = 0;

  geoList.forEach((g) => {
    positions.set(g.positions, posOffset);
    normals.set(g.normals, posOffset);
    for (let i = 0; i < g.indices.length; i++) {
      indices[indOffset + i] = g.indices[i] + vertOffset;
    }
    posOffset += g.positions.length;
    indOffset += g.indices.length;
    vertOffset += g.positions.length / 3;
  });

  return { positions, normals, indices };
}

// ==========================================
// 1. MODEL: kabel_roll.glb (Gulungan Kabel Listrik)
// ==========================================
function generateKabelRoll() {
  // Main coiled body (layers of white PVC toroids)
  const coils = [
    createTorusTube({ R: 0.45, r: 0.09, ox: 0, oy: -0.12, oz: 0 }),
    createTorusTube({ R: 0.38, r: 0.085, ox: 0, oy: -0.04, oz: 0 }),
    createTorusTube({ R: 0.46, r: 0.09, ox: 0, oy: 0.04, oz: 0 }),
    createTorusTube({ R: 0.40, r: 0.085, ox: 0, oy: 0.12, oz: 0 }),
  ];
  const coilMesh = mergeGeometries(coils);

  // Yellow & Blue Packaging Strap Band
  const straps = [
    createBox({ w: 0.06, h: 0.32, d: 0.95, ox: 0, oy: 0, oz: 0 }),
    createBox({ w: 0.95, h: 0.32, d: 0.06, ox: 0, oy: 0, oz: 0 }),
  ];
  const strapMesh = mergeGeometries(straps);

  // Inner plastic core sleeve
  const core = createCylinder({ rTop: 0.26, rBottom: 0.26, height: 0.30, segments: 24 });

  // Exposed copper wire end
  const wireTip = createCylinder({ rTop: 0.02, rBottom: 0.02, height: 0.14, ox: 0.52, oy: 0.16, oz: 0.1 });

  return buildGLB([
    {
      ...coilMesh,
      material: {
        name: "PVC_Cable_Insulation",
        baseColor: [0.94, 0.94, 0.92, 1.0], // Clean NYM white cable
        metallic: 0.05,
        roughness: 0.35,
      },
    },
    {
      ...strapMesh,
      material: {
        name: "Packaging_Tape_Yellow",
        baseColor: [0.98, 0.78, 0.05, 1.0], // Bright industrial yellow tape
        metallic: 0.1,
        roughness: 0.25,
      },
    },
    {
      ...core,
      material: {
        name: "Cardboard_Core",
        baseColor: [0.75, 0.62, 0.48, 1.0], // Tan kraft core
        metallic: 0.0,
        roughness: 0.8,
      },
    },
    {
      ...wireTip,
      material: {
        name: "Copper_Conductor",
        baseColor: [0.89, 0.45, 0.24, 1.0], // Metallic copper
        metallic: 0.95,
        roughness: 0.2,
      },
    },
  ]);
}

// ==========================================
// 2. MODEL: panel_box.glb (Panel Distribusi Metal)
// ==========================================
function generatePanelBox() {
  // Main metal enclosure box
  const mainBox = createBox({ w: 0.65, h: 0.85, d: 0.22, ox: 0, oy: 0, oz: 0 });

  // Front recessed door panel
  const door = createBox({ w: 0.62, h: 0.82, d: 0.02, ox: 0, oy: 0, oz: 0.115 });

  // Acrylic inspection window
  const windowGlass = createBox({ w: 0.44, h: 0.34, d: 0.015, ox: 0, oy: 0.16, oz: 0.126 });

  // Chrome key lock / door handle latch
  const lock = createCylinder({ rTop: 0.025, rBottom: 0.025, height: 0.03, ox: 0.25, oy: -0.05, oz: 0.13, segments: 16 });

  // Interior DIN rail with miniature MCB switches visible behind window
  const mcbSilhouettes = [
    createBox({ w: 0.06, h: 0.16, d: 0.08, ox: -0.15, oy: 0.16, oz: 0.06 }),
    createBox({ w: 0.06, h: 0.16, d: 0.08, ox: -0.08, oy: 0.16, oz: 0.06 }),
    createBox({ w: 0.06, h: 0.16, d: 0.08, ox: -0.01, oy: 0.16, oz: 0.06 }),
    createBox({ w: 0.06, h: 0.16, d: 0.08, ox: 0.06, oy: 0.16, oz: 0.06 }),
    createBox({ w: 0.06, h: 0.16, d: 0.08, ox: 0.13, oy: 0.16, oz: 0.06 }),
  ];
  const mcbs = mergeGeometries(mcbSilhouettes);

  // Warning triangle badge
  const warningDecal = createBox({ w: 0.08, h: 0.08, d: 0.005, ox: 0, oy: -0.22, oz: 0.128 });

  return buildGLB([
    {
      ...mainBox,
      material: {
        name: "Powder_Coated_Steel",
        baseColor: [0.82, 0.84, 0.86, 1.0], // Light industrial gray
        metallic: 0.45,
        roughness: 0.35,
      },
    },
    {
      ...door,
      material: {
        name: "Steel_Door_Panel",
        baseColor: [0.86, 0.88, 0.90, 1.0],
        metallic: 0.5,
        roughness: 0.3,
      },
    },
    {
      ...windowGlass,
      material: {
        name: "Smoked_Acrylic_Window",
        baseColor: [0.15, 0.2, 0.28, 0.85],
        metallic: 0.1,
        roughness: 0.1,
      },
    },
    {
      ...lock,
      material: {
        name: "Chrome_Hardware",
        baseColor: [0.92, 0.93, 0.95, 1.0],
        metallic: 0.95,
        roughness: 0.15,
      },
    },
    {
      ...mcbs,
      material: {
        name: "Interior_MCBs",
        baseColor: [0.95, 0.95, 0.95, 1.0],
        metallic: 0.1,
        roughness: 0.4,
      },
    },
    {
      ...warningDecal,
      material: {
        name: "Hazard_Decal",
        baseColor: [0.96, 0.72, 0.05, 1.0], // Yellow warning
        metallic: 0.0,
        roughness: 0.4,
      },
    },
  ]);
}

// ==========================================
// 3. MODEL: fitting_lampu.glb (Fitting Lampu Keramik / Porselen E27)
// ==========================================
function generateFittingLampu() {
  // Stepped ceramic body
  const bodyBase = createCylinder({ rTop: 0.34, rBottom: 0.38, height: 0.18, ox: 0, oy: -0.22, oz: 0, segments: 24 });
  const bodyMid = createCylinder({ rTop: 0.30, rBottom: 0.34, height: 0.22, ox: 0, oy: -0.04, oz: 0, segments: 24 });
  const bodyTop = createCylinder({ rTop: 0.27, rBottom: 0.30, height: 0.24, ox: 0, oy: 0.18, oz: 0, segments: 24 });
  const porcelainBody = mergeGeometries([bodyBase, bodyMid, bodyTop]);

  // E27 Screw thread interior (golden brass)
  const threadRings = [
    createTorusTube({ R: 0.21, r: 0.02, ox: 0, oy: 0.12, oz: 0 }),
    createTorusTube({ R: 0.21, r: 0.02, ox: 0, oy: 0.18, oz: 0 }),
    createTorusTube({ R: 0.21, r: 0.02, ox: 0, oy: 0.24, oz: 0 }),
  ];
  const brassThread = mergeGeometries(threadRings);

  // Center contact point
  const contact = createCylinder({ rTop: 0.06, rBottom: 0.06, height: 0.04, ox: 0, oy: 0.08, oz: 0 });

  // Terminal screw terminals at bottom
  const terminals = [
    createCylinder({ rTop: 0.035, rBottom: 0.035, height: 0.08, ox: -0.16, oy: -0.32, oz: 0 }),
    createCylinder({ rTop: 0.035, rBottom: 0.035, height: 0.08, ox: 0.16, oy: -0.32, oz: 0 }),
  ];
  const screwTerminals = mergeGeometries(terminals);

  return buildGLB([
    {
      ...porcelainBody,
      material: {
        name: "Glazed_Porcelain",
        baseColor: [0.96, 0.96, 0.97, 1.0], // High-gloss glazed porcelain
        metallic: 0.05,
        roughness: 0.15,
      },
    },
    {
      ...brassThread,
      material: {
        name: "Brass_E27_Thread",
        baseColor: [0.85, 0.65, 0.25, 1.0], // Metallic brass
        metallic: 0.9,
        roughness: 0.25,
      },
    },
    {
      ...contact,
      material: {
        name: "Copper_Center_Contact",
        baseColor: [0.88, 0.48, 0.25, 1.0],
        metallic: 0.95,
        roughness: 0.2,
      },
    },
    {
      ...screwTerminals,
      material: {
        name: "Terminal_Screws",
        baseColor: [0.8, 0.82, 0.85, 1.0],
        metallic: 0.85,
        roughness: 0.2,
      },
    },
  ]);
}

// ==========================================
// 4. MODEL: lampu_led_bulb.glb (Bohlam Lampu LED Philips)
// ==========================================
function generateLampuLedBulb() {
  // Frosted LED dome envelope
  const dome = createSphere({ radius: 0.38, ox: 0, oy: 0.24, oz: 0, widthSegments: 28, heightSegments: 20 });

  // Tapered heat-sink housing neck
  const heatSink = createCylinder({ rTop: 0.34, rBottom: 0.17, height: 0.30, ox: 0, oy: -0.05, oz: 0, segments: 24 });

  // Metallic threaded E27 base rings
  const baseCylinder = createCylinder({ rTop: 0.16, rBottom: 0.16, height: 0.18, ox: 0, oy: -0.28, oz: 0, segments: 24 });
  const threadRings = [
    createTorusTube({ R: 0.165, r: 0.015, ox: 0, oy: -0.22, oz: 0 }),
    createTorusTube({ R: 0.165, r: 0.015, ox: 0, oy: -0.27, oz: 0 }),
    createTorusTube({ R: 0.165, r: 0.015, ox: 0, oy: -0.32, oz: 0 }),
  ];
  const screwBase = mergeGeometries([baseCylinder, ...threadRings]);

  // Bottom contact tip
  const contactNipple = createSphere({ radius: 0.05, ox: 0, oy: -0.38, oz: 0, widthSegments: 16, heightSegments: 12 });

  return buildGLB([
    {
      ...dome,
      material: {
        name: "Frosted_Polycarbonate_Dome",
        baseColor: [0.98, 0.98, 1.0, 1.0],
        metallic: 0.0,
        roughness: 0.15,
      },
    },
    {
      ...heatSink,
      material: {
        name: "White_Plastic_HeatSink",
        baseColor: [0.93, 0.93, 0.94, 1.0],
        metallic: 0.05,
        roughness: 0.45,
      },
    },
    {
      ...screwBase,
      material: {
        name: "Aluminum_E27_Base",
        baseColor: [0.82, 0.84, 0.87, 1.0],
        metallic: 0.9,
        roughness: 0.2,
      },
    },
    {
      ...contactNipple,
      material: {
        name: "Base_Contact_Point",
        baseColor: [0.25, 0.25, 0.25, 1.0],
        metallic: 0.6,
        roughness: 0.4,
      },
    },
  ]);
}

// ==========================================
// 5. MODEL: isolasi_listrik.glb (Roll Isolasi Listrik 3M)
// ==========================================
function generateIsolasiListrik() {
  // Black PVC vinyl tape roll (thick ring)
  const outerLayers = [];
  const countLayers = 6;
  for (let l = 0; l < countLayers; l++) {
    const rad = 0.32 + l * 0.035;
    outerLayers.push(createTorusTube({ R: rad, r: 0.05, ox: 0, oy: 0, oz: 0, radialSegments: 20, tubularSegments: 32 }));
  }
  const tapeRoll = mergeGeometries(outerLayers);

  // Inner cardboard tube core
  const cardboardCore = createCylinder({ rTop: 0.28, rBottom: 0.28, height: 0.12, ox: 0, oy: 0, oz: 0, segments: 24 });

  // Red accent brand band on outer roll edge
  const brandStripe = createTorusTube({ R: 0.50, r: 0.012, ox: 0, oy: 0.04, oz: 0 });

  // Peeled tape tab
  const peelTab = createBox({ w: 0.12, h: 0.09, d: 0.01, ox: 0.52, oy: 0.08, oz: 0.05 });

  return buildGLB([
    {
      ...tapeRoll,
      material: {
        name: "Black_Vinyl_PVC_Tape",
        baseColor: [0.08, 0.08, 0.08, 1.0], // Glossy black electrical tape
        metallic: 0.1,
        roughness: 0.25,
      },
    },
    {
      ...cardboardCore,
      material: {
        name: "Kraft_Cardboard_Core",
        baseColor: [0.72, 0.58, 0.42, 1.0], // Tan kraft core
        metallic: 0.0,
        roughness: 0.85,
      },
    },
    {
      ...brandStripe,
      material: {
        name: "Brand_Red_Stripe",
        baseColor: [0.85, 0.15, 0.15, 1.0],
        metallic: 0.2,
        roughness: 0.3,
      },
    },
    {
      ...peelTab,
      material: {
        name: "Peeled_Tape_Tip",
        baseColor: [0.1, 0.1, 0.1, 1.0],
        metallic: 0.1,
        roughness: 0.25,
      },
    },
  ]);
}

// ==========================================
// 6. MODEL: kabel_ties.glb (Pack Kabel Ties Nylon 100pcs)
// ==========================================
function generateKabelTies() {
  // Bundle of long slender white nylon zip ties
  const ties = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const rad = 0.08 + (i % 3) * 0.02;
    const ox = Math.cos(angle) * rad;
    const oy = Math.sin(angle) * rad;
    ties.push(createBox({ w: 0.03, h: 0.015, d: 0.80, ox, oy, oz: 0 }));
  }
  const tieBundle = mergeGeometries(ties);

  // Molded zip tie ratchet heads at one end
  const heads = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const ox = Math.cos(angle) * 0.09;
    const oy = Math.sin(angle) * 0.09;
    heads.push(createBox({ w: 0.06, h: 0.05, d: 0.08, ox, oy, oz: 0.42 }));
  }
  const headBundle = mergeGeometries(heads);

  // Clear / blue commercial packaging strap wrap
  const packagingBand = createCylinder({ rTop: 0.14, rBottom: 0.14, height: 0.16, ox: 0, oy: 0, oz: -0.05, segments: 24 });

  return buildGLB([
    {
      ...tieBundle,
      material: {
        name: "Translucent_Nylon_66",
        baseColor: [0.93, 0.94, 0.96, 0.95],
        metallic: 0.05,
        roughness: 0.3,
      },
    },
    {
      ...headBundle,
      material: {
        name: "Molded_Locking_Heads",
        baseColor: [0.91, 0.92, 0.95, 1.0],
        metallic: 0.05,
        roughness: 0.35,
      },
    },
    {
      ...packagingBand,
      material: {
        name: "Packaging_Sleeve_Blue",
        baseColor: [0.05, 0.45, 0.85, 0.9],
        metallic: 0.1,
        roughness: 0.2,
      },
    },
  ]);
}

// ==========================================
// Generate All Models and Save to public/models/
// ==========================================
const modelsToGenerate = [
  { file: "kabel_roll.glb", gen: generateKabelRoll },
  { file: "panel_box.glb", gen: generatePanelBox },
  { file: "fitting_lampu.glb", gen: generateFittingLampu },
  { file: "lampu_led_bulb.glb", gen: generateLampuLedBulb },
  { file: "isolasi_listrik.glb", gen: generateIsolasiListrik },
  { file: "kabel_ties.glb", gen: generateKabelTies },
];

console.log("Generating tailored 3D models into:", MODELS_DIR);

modelsToGenerate.forEach(({ file, gen }) => {
  const targetPath = path.join(MODELS_DIR, file);
  const glbBuf = gen();
  fs.writeFileSync(targetPath, glbBuf);
  console.log(`[OK] Generated: ${file} (${glbBuf.length} bytes)`);
});

console.log("All tailored 3D GLB models successfully generated!");
