let terrainReady = false;

let scene, camera, renderer, controls, loader, textureLoader;
let terrainMesh;
let currentHeightMapUrl = "world.png";
let daySky, nightSky;
let biomeMap;

const TERRAIN_WIDTH = 1000;
const TERRAIN_HEIGHT = 1000;
const TERRAIN_DEPTH_SCALE = 40; // Scaling factor
const TERRAIN_OFFSET = 0;

// Since the animals and plants use an instanced mesh, there needs to be a limit to
// the number of different animals and plants
const MAX_TREES = 1000;
const MAX_SPRUCES = 1000;
const MAX_CACTI = 1000;

const MAX_DEER = 100;
const MAX_WOLVES = 100;
const MAX_SNAKES = 100;

// Tree = regular forest tree
let leafInstances;
let trunkInstances;

// Deer
let deerInstances;

// Wolf
let wolfInstances;

// Snake
let snakeInstances;

let leafModelReady = false;
let trunkModelReady = false;
let deerModelReady = false;
let wolfModelReady = false;
let snakeModelReady = false;

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
  // scene.background = new THREE.Color(0x87ceeb); // Blue sky backgroudn
  scene.fog = new THREE.Fog(0x87ceeb, TERRAIN_WIDTH / 2, TERRAIN_WIDTH * 1.5);
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.y = TERRAIN_DEPTH_SCALE * 0.5;
  camera.position.z = 6;

  let currentSkybox = "day"; // current skybox mode

  // load skybox textures
  function pathStrings(filename, timeOfDay) {
    const pathBase = "textures/skybox/";
    const baseFilename = pathBase + timeOfDay + "/" + filename;
    const fileType = ".jpg";
    const sides = ["Back", "Front", "Top", "Bottom", "Right", "Left"];
    const pathStrings = sides.map((side) => {
      return baseFilename + "_" + side + fileType;
      control.log("Loading skybox texture ", path); // error checking

      return path;
    });

    return pathStrings;
  }

  // toggle to change the skybox based on the current mode
  function changeSkybox() {
    if (currentSkybox === "day") {
      scene.remove(daySky);
      scene.add(nightSky);
      currentSkybox = "night";

      // adjust lighting for the night sky skybox
      directionalLight.intensity = 0.1;
      ambientLight.intensity = 0.2;
    } else {
      scene.remove(nightSky);
      scene.add(daySky);
      currentSkybox = "day";

      // adjust lighting for the day time skybox
      directionalLight.intensity = 1.0;
      ambientLight.intensity = 0.5;
    }
  }

  // UI button creation
  function SkyboxToggle() {
    const toggleDiv = document.createElement("div");
    toggleDiv.id = "skyboxToggle";
    toggleDiv.style.position = "absolute";
    toggleDiv.style.top = "70px";
    toggleDiv.style.left = "10px";
    toggleDiv.style.zIndex = "100";
    toggleDiv.style.background = "rgba(255, 255, 255, 0.7)";
    toggleDiv.style.padding = "5px";
    toggleDiv.style.borderRadius = "5px";

    const skyboxBtn = document.createElement("button");
    skyboxBtn.textContent = "Toggle Day/ Night";
    skyboxBtn.style.margin = "2px";
    skyboxBtn.style.padding = "5px 10px";
    skyboxBtn.onclick = changeSkybox;

    toggleDiv.appendChild(skyboxBtn);
    document.body.appendChild(toggleDiv);
  }

  function createMaterialArray(filename, timeOfDay) {
    const imagePath = pathStrings(filename, timeOfDay);
    const skyboxMat = imagePath.map((image) => {
      let skyboxTex = new THREE.TextureLoader().load(image);

      return new THREE.MeshBasicMaterial({
        map: skyboxTex,
        side: THREE.BackSide,
      });
    });

    return skyboxMat;
  }

  // skybox meshes
  function skyboxCreate() {
    // daytime
    const dayMat = createMaterialArray("sky", "day");
    const skyboxGeo = new THREE.BoxGeometry(1000, 1000, 1000);
    daySky = new THREE.Mesh(skyboxGeo, dayMat);

    // night time
    const nightMat = createMaterialArray("sky", "night");
    nightSky = new THREE.Mesh(skyboxGeo, nightMat);

    // add the daytime skybox to the scene
    scene.add(daySky);
  }

  ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(50, 100, 50);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  skyboxCreate();
  SkyboxToggle();

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

  controls = new THREE.PointerLockControls(camera, document.body);
  renderer.domElement.addEventListener("click", function () {
    controls.lock();
  });

  scene.add(controls.getObject());

  document.addEventListener("keydown", onKeyDown);

  //   const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  //   scene.add(ambientLight);

  //   const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  //   directionalLight.position.set(50, 100, 50);
  //   directionalLight.castShadow = true;
  //   scene.add(directionalLight);

  // Load heightmap and create terrain
  loadNewTerrain(currentHeightMapUrl);
  createWater();
  setupMapButtons();

  textureLoader = new THREE.TextureLoader();

  loader = new THREE.OBJLoader();
  // Default model directory is the assets folder
  loader.setPath("assets/");

  // Load the buoy
  loader.load("buoy.obj", function (obj) {
    obj.position.set(-50, 2, 0);
    obj.scale.set(1, 1, 1);

    obj.traverse(function (child) {
      if (child.isMesh) {
        child.material = new THREE.MeshPhongMaterial({
          color: 0xb03131,
        });
      }
    });

    scene.add(obj);
  });

  loadTreeModel();
  loadDeerModel();
  loadWolfModel();
  loadSnakeModel();

  checkAndPlaceAssets();

  window.addEventListener("resize", onWindowResize, false);
}

// Combined placement check
function checkAndPlaceAssets() {
  if (terrainReady) {
    if (leafModelReady && trunkModelReady) {
      placeTrees();
    }
    if (deerModelReady) {
      placeDeer();
    }
    if (wolfModelReady) {
      placeWolves();
    }
    if (snakeModelReady) {
      placeSnakes();
    }
  }
}

function placeTrees() {
  if (!terrainReady || !leafInstances || !trunkInstances) {
    return;
  }

  const temp = new THREE.Object3D();
  let instanceCount = 0;

  if (
    !terrainMesh ||
    !terrainMesh.geometry ||
    !terrainMesh.geometry.attributes ||
    !terrainMesh.geometry.attributes.position
  ) {
    return;
  }
  const terrainVertices = terrainMesh.geometry.attributes.position.array;
  const imgWidth = terrainMesh.geometry.parameters.widthSegments + 1;
  const imgHeight = terrainMesh.geometry.parameters.heightSegments + 1;

  for (let i = 0; i < imgHeight; i++) {
    for (let j = 0; j < imgWidth; j++) {
      if (instanceCount >= MAX_TREES) break;

      const vertexIndex = (i * imgWidth + j) * 3;

      if (
        vertexIndex + 2 >= terrainVertices.length ||
        !biomeMap ||
        !biomeMap[i] ||
        biomeMap[i][j] === undefined
      ) {
        continue;
      }

      const terrainHeight = terrainVertices[vertexIndex + 2];
      const biomeId = biomeMap[i][j];

      if (
        terrainHeight > 4 &&
        biomeId === biomes.forest &&
        Math.random() < 0.005
      ) {
        const worldX = terrainVertices[vertexIndex];
        const worldY = terrainHeight;
        const worldZ = -terrainVertices[vertexIndex + 1];

        temp.position.set(worldX, worldY, worldZ);
        const scale = 0.1;
        temp.scale.set(scale, scale, scale);

        temp.updateMatrix();
        // Apply matrix to both instances
        leafInstances.setMatrixAt(instanceCount, temp.matrix);
        trunkInstances.setMatrixAt(instanceCount, temp.matrix);
        instanceCount++;
      }
    }
  }

  // Update both instances
  leafInstances.count = instanceCount;
  leafInstances.instanceMatrix.needsUpdate = true;
  trunkInstances.count = instanceCount;
  trunkInstances.instanceMatrix.needsUpdate = true;
}

function placeDeer() {
  placeAnimal(deerInstances, MAX_DEER, 0.0008, 0.4, biomes.forest);
}

function placeSnakes() {
  placeAnimal(snakeInstances, MAX_SNAKES, 0.0008, 0.4, biomes.desert);
}

function placeWolves() {
  placeAnimal(wolfInstances, MAX_WOLVES, 0.0008, 0.4, biomes.winterForest);
}

function placeAnimal(instancedMesh, maximum, probability, scale, biome) {
  const temp = new THREE.Object3D();
  let instanceCount = 0;
  if (
    !terrainMesh ||
    !terrainMesh.geometry ||
    !terrainMesh.geometry.attributes ||
    !terrainMesh.geometry.attributes.position
  )
    return;
  const terrainVertices = terrainMesh.geometry.attributes.position.array;
  const imgWidth = terrainMesh.geometry.parameters.widthSegments + 1;
  const imgHeight = terrainMesh.geometry.parameters.heightSegments + 1;

  for (let i = 0; i < imgHeight; i++) {
    for (let j = 0; j < imgWidth; j++) {
      if (instanceCount >= maximum) break;
      const vertexIndex = (i * imgWidth + j) * 3;

      // In case the biomeMap wasn't filled out properly
      if (
        vertexIndex + 2 >= terrainVertices.length ||
        !biomeMap ||
        !biomeMap[i] ||
        biomeMap[i][j] === undefined
      )
        continue;
      const terrainHeight = terrainVertices[vertexIndex + 2];
      const biomeId = biomeMap[i][j];

      if (
        terrainHeight > 4 &&
        biomeId === biome &&
        Math.random() < probability
      ) {
        const worldX = terrainVertices[vertexIndex];
        const worldY = terrainHeight;
        const worldZ = -terrainVertices[vertexIndex + 1];

        temp.position.set(worldX, worldY, worldZ);
        temp.rotation.y = Math.random() * Math.PI * 2;
        temp.scale.set(scale, scale, scale);

        temp.updateMatrix();
        instancedMesh.setMatrixAt(instanceCount, temp.matrix);
        instanceCount++;
      }
    }
  }
  instancedMesh.count = instanceCount;
  instancedMesh.instanceMatrix.needsUpdate = true;
}

function loadTreeModel() {
  // Reset
  leafModelReady = false;
  trunkModelReady = false;
  if (leafInstances) scene.remove(leafInstances);
  if (trunkInstances) scene.remove(trunkInstances);
  leafInstances = null;
  trunkInstances = null;

  loader.load("Tree low.obj", (object) => {
    const leafGeometry = object.children[0].geometry;
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: "green",
      side: THREE.DoubleSide,
    });

    const trunkGeometry = object.children[1].geometry;
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

    leafInstances = new THREE.InstancedMesh(
      leafGeometry,
      leafMaterial,
      MAX_TREES
    );
    leafInstances.castShadow = true;
    leafInstances.receiveShadow = true;
    scene.add(leafInstances);
    leafModelReady = true;

    trunkInstances = new THREE.InstancedMesh(
      trunkGeometry,
      trunkMaterial,
      MAX_TREES
    );
    trunkInstances.castShadow = true;
    trunkInstances.receiveShadow = true;
    scene.add(trunkInstances);
    trunkModelReady = true;

    checkAndPlaceAssets();
  });
}

function loadDeerModel() {
  deerModelReady = false;
  if (deerInstances) scene.remove(deerInstances);
  deerInstances = null;

  const deerTexture = textureLoader.load("textures/deer_fur.jpeg");

  loader.load("deer.obj", (object) => {
    const deerGeometry = object.children[0].geometry;
    const deerMaterial = new THREE.MeshStandardMaterial({ map: deerTexture });

    deerInstances = new THREE.InstancedMesh(
      deerGeometry,
      deerMaterial,
      MAX_DEER
    );
    deerInstances.castShadow = true;
    deerInstances.receiveShadow = true;
    scene.add(deerInstances);
    deerModelReady = true;

    checkAndPlaceAssets();
  });
}

function loadWolfModel() {
  wolfModelReady = false;
  if (wolfInstances) scene.remove(wolfInstances);
  wolfInstances = null;

  const wolfTexture = textureLoader.load("textures/wolf_fur.jpg");

  loader.load("wolf.obj", (object) => {
    const wolfGeometry = object.children[0].geometry;
    const wolfMaterial = new THREE.MeshStandardMaterial({ map: wolfTexture });

    wolfInstances = new THREE.InstancedMesh(
      wolfGeometry,
      wolfMaterial,
      MAX_WOLVES
    );
    wolfInstances.castShadow = true;
    wolfInstances.receiveShadow = true;
    scene.add(wolfInstances);
    wolfModelReady = true;

    checkAndPlaceAssets();
  });
}

function loadSnakeModel() {
  if (snakeInstances) scene.remove(snakeInstances);
  snakeInstances = null;

  const snakeTexture = textureLoader.load("textures/snake.jpg");

  loader.load("snake.obj", (object) => {
    const snakeGeometry = object.children[0].geometry;
    const snakeMaterial = new THREE.MeshStandardMaterial({ map: snakeTexture });

    snakeInstances = new THREE.InstancedMesh(
      snakeGeometry,
      snakeMaterial,
      MAX_SNAKES
    );
    snakeInstances.castShadow = true;
    snakeInstances.receiveShadow = true;
    scene.add(snakeInstances);
    snakeModelReady = true;

    checkAndPlaceAssets();
  });
}

function setupMapButtons() {
  const japanButton = document.getElementById("japanBtn");
  const sriLankaButton = document.getElementById("sriLankaBtn");
  const defaultButton = document.getElementById("defaultBtn");
  const hawaiiButton = document.getElementById("hawaiiBtn");
  const worldButton = document.getElementById("worldBtn");

  japanButton.addEventListener("click", () => {
    loadNewTerrain("japan.png");
  });
  sriLankaButton.addEventListener("click", () => {
    loadNewTerrain("sri lanka.png");
  });
  defaultButton.addEventListener("click", () => {
    loadNewTerrain("default.png");
  });
  hawaiiButton.addEventListener("click", () => {
    loadNewTerrain("hawaii.png");
  });
  worldButton.addEventListener("click", () => {
    loadNewTerrain("world.png");
  });
}

function loadNewTerrain(mapFilename) {
  terrainReady = false;
  if (terrainMesh) {
    scene.remove(terrainMesh);
    if (terrainMesh.geometry) terrainMesh.geometry.dispose();
    if (terrainMesh.material) {
      terrainMesh.material.dispose();
    }
    terrainMesh = null;
  }
  // Reset all instances
  if (leafInstances) {
    leafInstances.count = 0;
    leafInstances.instanceMatrix.needsUpdate = true;
  }
  if (trunkInstances) {
    trunkInstances.count = 0;
    trunkInstances.instanceMatrix.needsUpdate = true;
  }
  if (deerInstances) {
    deerInstances.count = 0;
    deerInstances.instanceMatrix.needsUpdate = true;
  }
  if (wolfInstances) {
    wolfInstances.count = 0;
    wolfInstances.instanceMatrix.needsUpdate = true;
  }

  currentHeightMapUrl = "textures/" + mapFilename;

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
  return;
}

function createTerrain(heightMapTexture, biomeMapTexture) {
  if (terrainMesh) scene.remove(terrainMesh);
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

  biomeMap = new Array(imgHeight);
  for (i = 0; i < biomeMap.length; i++) {
    biomeMap[i] = new Array(imgWidth);
  }

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
      biomeMap[y][x] = biomeId;
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

  if (terrainMesh) scene.remove(terrainMesh);
  terrainMesh = new THREE.Mesh(geometry, material);
  terrainMesh.rotation.x = -Math.PI / 2;
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  scene.add(terrainMesh);

  terrainReady = true; // Set the flag indicating terrain is ready
  checkAndPlaceAssets(); // Attempt to place assets now that terrain is ready
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
