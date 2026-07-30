import * as THREE from 'three';

// ── Colour-baked geometry batching ───────────────────────────────────────
//
// The problem this solves: this game is built out of primitives, and the thing
// that makes two primitives need two draw calls is almost always *nothing but
// their colour*. A cubicle desk is a toon beige box and a toon grey box; a
// character is a toon skin sphere and a toon shirt lathe. Identical shader,
// identical flags, identical maps — different `material.color`.
//
// So: move the colour out of the uniform and into the vertex buffer. Every mesh
// in a bucket gets a `color` attribute filled with its own material colour, the
// bucket is merged into one geometry, and the batch draws with ONE shared
// material whose `color` is white and whose `vertexColors` is on.
//
// This is exact, not approximate. `MeshToonMaterial`/`MeshStandardMaterial`
// compute `diffuseColor.rgb = diffuse * vColor` (three's <color_fragment>), and
// `diffuse` is `material.color` already converted to the working colour space.
// Vertex colours are *not* converted — three treats them as working-space by
// contract — so writing `material.color.r/g/b` straight into a Float32 attribute
// and setting the shared material's colour to exactly (1,1,1) makes the shader
// compute `1.0 * c`, which is bit-exact in IEEE754. The frozen-frame odiff A/B
// in tools/perf-harness.mjs (`--bake=off`) is the standing proof.
//
// ELIGIBILITY — deliberately narrow, because the failure mode of getting this
// wrong is a wrong-coloured surface, and this is a performance change:
//   • no textures except `gradientMap` and `normalMap`, and those must MATCH
//     across the bucket. Those two are the only map slots in this project that
//     are always cache-owned and never per-room (toon ramps are shared
//     DataTextures, normal maps come out of ProceduralNormals). Every other map
//     slot in the codebase can be a per-instance canvas, and a per-instance
//     canvas inside a *shared* batch material is a use-after-dispose waiting
//     for the room that owns it to unload.
//   • `vertexColors` must be off already (nothing to fight over).
//   • no `onBeforeCompile` / no custom `customProgramCacheKey` — a hand-patched
//     shader may not honour vColor at all.
//   • every other visual property must be equal, which is what the signature
//     below enumerates. When in doubt a property goes IN the signature: a
//     needlessly narrow bucket costs a draw call, a needlessly wide one costs
//     a wrong pixel.
//
// The shared batch materials are cached forever, keyed by signature, and are
// registered in BATCH_MATERIALS so Room.dispose()'s ownership sweep can see
// that they (and their maps) belong to a cache and must never be disposed.

export const BATCH_MATERIALS = new Set();

const clones = new Map();

// Off switch for the harness A/B (`window.__bakeColor = false` before a build).
export const bakeEnabled = () =>
  typeof window === 'undefined' || window.__bakeColor !== false;

const uid = (t) => (t ? t.uuid : '-');
const num = (n) => (n === undefined || n === null ? '-' : Math.round(n * 1e4) / 1e4);

// Map slots that disqualify a material outright if present. This is the
// complement of {gradientMap, normalMap} over three's texture slots — kept as an
// explicit list so a future material tier cannot silently opt itself in.
const BLOCKING_MAPS = [
  'map', 'alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap',
  'envMap', 'lightMap', 'metalnessMap', 'roughnessMap', 'specularMap',
  'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap', 'iridescenceMap',
  'iridescenceThicknessMap', 'sheenColorMap', 'sheenRoughnessMap',
  'specularColorMap', 'specularIntensityMap', 'thicknessMap', 'transmissionMap',
  'anisotropyMap', 'matcap',
];

// Everything that must be equal for two meshes to be legally drawn by one call
// with colour moved to the vertex buffer. Returns null when the material is not
// eligible at all.
export function materialSignature(mat) {
  if (!mat || Array.isArray(mat)) return null;
  if (!mat.color) return null;          // nothing to move into the vertex buffer
  if (mat.vertexColors) return null;
  // OPAQUE ONLY. Identity-keyed merging of transparent meshes is order-safe
  // because every quad in the bucket has the same colour AND alpha, so alpha
  // blending inside the bucket commutes. Colour-baking breaks exactly that
  // premise: it puts DIFFERENT colours in one bucket, and src-alpha blending of
  // two different colours is not commutative, so losing the per-object depth
  // sort would change overlapping pixels. Measured, cubicle_farm roomFX (136
  // contact blobs): baking transparents moved 2707 px at odiff threshold 0.1
  // against a 32 px control floor. Opaque-only took it to 39 px.
  if (mat.transparent || mat.depthWrite === false) return null;
  if (mat.onBeforeCompile && mat.onBeforeCompile.length) return null;
  if (mat.customProgramCacheKey && mat.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey) return null;
  if (mat.isShaderMaterial || mat.isRawShaderMaterial) return null;
  for (const slot of BLOCKING_MAPS) if (mat[slot]) return null;
  return [
    mat.type,
    uid(mat.gradientMap), uid(mat.normalMap),
    mat.normalMapType ?? '-',
    mat.normalScale ? `${num(mat.normalScale.x)},${num(mat.normalScale.y)}` : '-',
    num(mat.roughness), num(mat.metalness), num(mat.opacity), num(mat.alphaTest),
    num(mat.reflectivity), num(mat.ior), num(mat.clearcoat), num(mat.clearcoatRoughness),
    num(mat.sheen), num(mat.transmission), num(mat.thickness), num(mat.iridescence),
    num(mat.emissiveIntensity), num(mat.envMapIntensity),
    mat.emissive ? mat.emissive.getHexString() : '-',
    mat.specular ? mat.specular.getHexString() : '-',
    mat.sheenColor ? mat.sheenColor.getHexString() : '-',
    mat.attenuationColor ? mat.attenuationColor.getHexString() : '-',
    mat.transparent ? 1 : 0, mat.depthWrite ? 1 : 0, mat.depthTest ? 1 : 0,
    mat.blending, mat.side, mat.shadowSide ?? '-',
    mat.flatShading ? 1 : 0, mat.wireframe ? 1 : 0, mat.dithering ? 1 : 0,
    mat.premultipliedAlpha ? 1 : 0, mat.toneMapped ? 1 : 0, mat.fog ? 1 : 0,
    mat.clipShadows ? 1 : 0, mat.clipIntersection ? 1 : 0,
    mat.polygonOffset ? `${mat.polygonOffsetFactor},${mat.polygonOffsetUnits}` : '-',
    mat.stencilWrite ? 1 : 0, mat.colorWrite ? 1 : 0, mat.alphaToCoverage ? 1 : 0,
  ].join('|');
}

// The one shared white material every batch with this signature draws with.
// Cached forever — these are cache resources by construction.
export function batchMaterialFor(mat, signature) {
  const key = signature ?? materialSignature(mat);
  if (!key) return null;
  let clone = clones.get(key);
  if (!clone) {
    clone = mat.clone();
    // setScalar writes r=g=b directly with NO colour-space conversion, which is
    // what makes `diffuse * vColor` an exact multiply by 1.0. setHex(0xffffff)
    // would also land on 1.0 today, but only because sRGB->linear maps 1 to 1;
    // setScalar does not depend on that.
    clone.color.setScalar(1);
    clone.vertexColors = true;
    clone.name = `batch:${mat.type}`;
    clone.userData = { ...(clone.userData || {}), batchShared: true };
    clones.set(key, clone);
    BATCH_MATERIALS.add(clone);
  }
  return clone;
}

// Write a flat per-vertex colour into `g` (linear-sRGB, straight from
// material.color — see the header note on colour space).
export function bakeVertexColor(g, color) {
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  const { r, b } = color;
  const gr = color.g;
  for (let i = 0; i < n; i++) { arr[i * 3] = r; arr[i * 3 + 1] = gr; arr[i * 3 + 2] = b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
