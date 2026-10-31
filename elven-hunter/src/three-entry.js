/* The slice of three.js the game uses. tools/build.mjs bundles this with esbuild
   into a self-contained `THREE` global and inlines it into index.html, so the
   game still runs from one file with no network. Add names here as needed. */
export {
  WebGLRenderer, Scene, PerspectiveCamera, Fog, Color, ColorManagement,
  LinearSRGBColorSpace, NoToneMapping,
  BufferGeometry, Float32BufferAttribute, InstancedBufferAttribute, DynamicDrawUsage,
  Mesh, InstancedMesh, MeshLambertMaterial, MeshBasicMaterial, DoubleSide,
  HemisphereLight, DirectionalLight, Vector3, REVISION,
  Group, Box3, AnimationMixer, AnimationClip, LoopOnce, LoopRepeat, NoColorSpace,
  PCFShadowMap,
} from 'three';
export { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
export { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
