let scene, camera, renderer, controls, loader;
let terrainMesh;
let currentHeightMapUrl = "world.png";

const TERRAIN_WIDTH = 1000;
const TERRAIN_HEIGHT = 1000;
const TERRAIN_DEPTH_SCALE = 40; // Scaling factor
const TERRAIN_OFFSET = 0;

const biomes = {
  desert: 0xffff00,
  winterForest: 0x0000ff,
  forest: 0x00ff00,
  city: 0xff0000,
};

init();
animate();

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // Blue sky backgroudn
  scene.fog = new THREE.Fog(0x87ceeb, TERRAIN_WIDTH / 2, TERRAIN_WIDTH * 1.5);
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.y = TERRAIN_DEPTH_SCALE * 0.5;
  camera.position.z = 6;

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Use pointer lock controls
  controls = new THREE.PointerLockControls(camera, document.body);
  renderer.domElement.addEventListener("click", function () {
    controls.lock();
  });

  scene.add(controls.getObject());

  document.addEventListener("keydown", onKeyDown);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(50, 100, 50);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Load heightmap and create terrain
  loadNewTerrain(currentHeightMapUrl);
  createWater();
  setupMapButtons();

  loader = new THREE.OBJLoader();

  loader.load("assets/deer.obj", function (obj) {
    obj.position.set(0, 50, 0);
    obj.scale.set(1, 1, 1);
    scene.add(obj);
  });

  const mtlLoader = new THREE.MTLLoader();
  mtlLoader.setPath("assests/");
  mtlLoader.load("buoy.mtl", function (materials) {
    materials.preload();

    const loader = new THREE.OBJLoader();
    loader.setMaterials(materials);
    loader.setPath("assets/");
    loader.load("buoy.obj", function (buoy) {
      buoy.position.set(100, 2, 100);
      buoy.scale.set(1, 1, 1);

      scene.add(buoy);
    });
  });

  window.addEventListener("resize", onWindowResize, false);
}

function setupMapButtons() {
  const japanButton = document.getElementById("japanBtn");
  const sriLankaButton = document.getElementById("sriLankaBtn");
  const irelandButton = document.getElementById("irelandBtn");
  const hawaiiButton = document.getElementById("hawaiiBtn");
  const worldButton = document.getElementById("worldBtn");

  japanButton.addEventListener("click", () => {
    loadNewTerrain("japan.png");
  });
  sriLankaButton.addEventListener("click", () => {
    loadNewTerrain("sri lanka.png");
  });
  irelandButton.addEventListener("click", () => {
    loadNewTerrain("ireland.png");
  });
  hawaiiButton.addEventListener("click", () => {
    loadNewTerrain("hawaii.png");
  });
  worldButton.addEventListener("click", () => {
    loadNewTerrain("world.png");
  });
}

function loadNewTerrain(mapFilename) {
  if (terrainMesh) {
    // Remove previous mesh if it exists
    scene.remove(terrainMesh);
  }

  currentHeightMapUrl = "textures/" + mapFilename;
  console.log(currentHeightMapUrl);

  const loader = new THREE.TextureLoader();
  loader.load(currentHeightMapUrl, function (texture) {
    loader.load(
      "textures/" + mapFilename.split(".")[0] + "-biome.png",
      function (biomeTexture) {
        console.log("textures/" + mapFilename.split(".")[0] + "-biome.png");
        createTerrain(texture, biomeTexture);
      }
    );
  });
}

function createTerrain(heightMapTexture, biomeMapTexture) {
  const img = heightMapTexture.image;
  const imgWidth = img.width;
  const imgHeight = img.height;

  const biomeImg = biomeMapTexture.image;

  if (biomeImg.width != imgWidth || biomeImg.height != imgHeight) {
    console.error("Height map and biome map are not the same size");
    return;
  }

  // Use canvas to access pixel information
  const canvas = document.createElement("canvas");
  canvas.width = imgWidth;
  canvas.height = imgHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(img, 0, 0);
  const imgData = context.getImageData(0, 0, imgWidth, imgHeight).data;

  // Use another canvas to access biome information
  const biomeCanvas = document.createElement("canvas");
  biomeCanvas.width = imgWidth;
  biomeCanvas.height = imgHeight;
  const biomeContext = biomeCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  biomeContext.drawImage(biomeImg, 0, 0);
  const biomeData = biomeContext.getImageData(0, 0, imgWidth, imgHeight).data;

  // Subtract 1 from both img width and height to count segments, not vertices
  const geometry = new THREE.PlaneGeometry(
    TERRAIN_WIDTH,
    TERRAIN_HEIGHT,
    imgWidth - 1,
    imgHeight - 1
  );

  const vertices = geometry.attributes.position.array;
  const colours = new Float32Array(vertices.length);

  let vertexColour = new THREE.Color();
  // For each pixel in the heightmap, adjust the vertex height
  for (let y = 0; y < imgHeight; y++) {
    for (let x = 0; x < imgWidth; x++) {
      const pixelIndex = (y * imgWidth + x) * 4; // Each pixel has 4 parts: RGBA
      const vertexIndex = (y * imgWidth + x) * 3; // Each vertex has 3 parts: X, Y, Z

      // Change the z component (vertex index + 2)
      vertices[vertexIndex + 2] =
        (imgData[pixelIndex] / 255) * TERRAIN_DEPTH_SCALE;
      if (vertices[vertexIndex + 2] < 1) {
        vertices[vertexIndex + 2] = -40;
      }
      const biomeId =
        (biomeData[pixelIndex] << 16) +
        (biomeData[pixelIndex + 1] << 8) +
        biomeData[pixelIndex + 2];
      switch (biomeId) {
        case biomes.desert:
          vertexColour.setRGB(0.7, 0.6, 0.1);
          break;
        case biomes.forest:
          vertexColour.setRGB(0.1, 0.8, 0.3);
          break;
        case biomes.winterForest:
          vertexColour.setRGB(0.75, 0.8, 0.9);
          break;
        case biomes.city:
          vertexColour.setRGB(0.3, 0.2, 0.5);
          break;
        default:
          vertexColour.setRGB(0, 0.5, 0.9);
      }

      vertexColour.toArray(colours, vertexIndex);
    }
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));

  // Recalculate normals
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.FrontSide,
  });

  terrainMesh = new THREE.Mesh(geometry, material);
  terrainMesh.rotation.x = -Math.PI / 2;
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  scene.add(terrainMesh);
}

function createWater() {
  const waterGeometry = new THREE.PlaneGeometry(10000, 10000); // Very large plane

  const waterMaterial = new THREE.MeshPhongMaterial({
    color: 0x006994,
    shininess: 60,
  });

  const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.y = 1;
  waterMesh.receiveShadow = true;

  scene.add(waterMesh);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  renderer.render(scene, camera);
}

// Key event handlers
function onKeyDown(event) {
  if (controls.isLocked) {
    const speed = 6;

    switch (event.code) {
      case "KeyW":
        controls.moveForward(speed);
        break;
      case "KeyA":
        controls.moveRight(-speed);
        break;
      case "KeyS":
        controls.moveForward(-speed);
        break;
      case "KeyD":
        controls.moveRight(speed);
        break;
      case "Space":
        controls.getObject().position.y += speed;
        break;
      case "ShiftLeft":
      case "KeyQ":
        controls.getObject().position.y -= speed;
        break;
    }
  }
}
