let terrainReady = false; // Flag to check if terrain is ready

let scene, camera, renderer, controls, loader;
let terrainMesh;
let currentHeightMapUrl = 'world.png';
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

let leafModelReady = false;
let trunkModelReady = false;
let deerModelReady = false;

const biomes = {
    desert: 0xFFFF00,
    winterForest: 0x0000FF,
    forest: 0x00FF00,
    city: 0xFF0000
}

init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Blue sky backgroudn
    scene.fog = new THREE.Fog(0x87CEEB, TERRAIN_WIDTH / 2, TERRAIN_WIDTH * 1.5);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.y = TERRAIN_DEPTH_SCALE *0.5;
    camera.position.z = 6;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Use THREE namespace for controls
    controls = new THREE.PointerLockControls(camera, document.body);
    renderer.domElement.addEventListener('click', function() {controls.lock();});

    scene.add(controls.getObject());

    document.addEventListener('keydown', onKeyDown);

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
    // Default model directory is the assets folder
    loader.setPath("assets/");

    loadTreeModel();
    loadDeerModel(); // Load deer model

    window.addEventListener('resize', onWindowResize, false);
}

// Combined placement check
function checkAndPlaceAssets() {
    if (terrainReady && leafModelReady && trunkModelReady) {
        placeTrees();
    }
    if (terrainReady && deerModelReady) {
        placeDeer();
    }
}

function placeTrees() {
    if (!terrainReady || !leafInstances || !trunkInstances) {
        return;
    }

    const temp = new THREE.Object3D();
    let instanceCount = 0;

    if (!terrainMesh ||!terrainMesh.geometry || !terrainMesh.geometry.attributes || !terrainMesh.geometry.attributes.position) {
        return;
    }
    const terrainVertices = terrainMesh.geometry.attributes.position.array;
    const imgWidth = terrainMesh.geometry.parameters.widthSegments + 1;
    const imgHeight = terrainMesh.geometry.parameters.heightSegments + 1;

    for (let i = 0; i < imgHeight; i++) { 
        for (let j = 0; j < imgWidth; j++) {

            if (instanceCount >= MAX_TREES) 
                break; 

            const vertexIndex = (i * imgWidth + j) * 3;

            if (vertexIndex + 2 >= terrainVertices.length || !biomeMap || !biomeMap[i] || biomeMap[i][j] === undefined) {
                continue;
            }

            const terrainHeight = terrainVertices[vertexIndex + 2];
            const biomeId = biomeMap[i][j];

            if (terrainHeight > 1 && biomeId === biomes.forest && Math.random() < 0.005) {
                const worldX = terrainVertices[vertexIndex];
                const worldY = terrainHeight;
                const worldZ = -terrainVertices[vertexIndex + 1];

                temp.position.set(worldX, worldY, worldZ);
                const scale = 0.1
                temp.scale.set(scale, scale, scale);

                temp.updateMatrix();
                // Apply matrix to both instances
                leafInstances.setMatrixAt(instanceCount, temp.matrix);
                trunkInstances.setMatrixAt(instanceCount, temp.matrix);
                instanceCount++;
            }
        }
        if (instanceCount >= MAX_TREES) break; // Break outer loop too
    }

    // Update both instances
    leafInstances.count = instanceCount;
    leafInstances.instanceMatrix.needsUpdate = true;
    trunkInstances.count = instanceCount;
    trunkInstances.instanceMatrix.needsUpdate = true;
}

function placeDeer() {
    if (!terrainReady || !deerInstances) {
        return;
    }

    const temp = new THREE.Object3D();
    let instanceCount = 0;
    if (!terrainMesh || !terrainMesh.geometry || !terrainMesh.geometry.attributes || !terrainMesh.geometry.attributes.position) { return; }
    const terrainVertices = terrainMesh.geometry.attributes.position.array;
    const imgWidth = terrainMesh.geometry.parameters.widthSegments + 1;
    const imgHeight = terrainMesh.geometry.parameters.heightSegments + 1;

    for (let i = 0; i < imgHeight; i++) {
        for (let j = 0; j < imgWidth; j++) {
            if (instanceCount >= MAX_DEER) break;
            const vertexIndex = (i * imgWidth + j) * 3;
            if (vertexIndex + 2 >= terrainVertices.length || !biomeMap || !biomeMap[i] || biomeMap[i][j] === undefined) { continue; }
            const terrainHeight = terrainVertices[vertexIndex + 2];
            const biomeId = biomeMap[i][j];

            // Increase spawn chance drastically for debugging
            if (terrainHeight > 1 && biomeId === biomes.forest && Math.random() < 0.0008) { 
                const worldX = terrainVertices[vertexIndex];
                const worldY = terrainHeight;
                const worldZ = -terrainVertices[vertexIndex + 1];
                
                temp.position.set(worldX, worldY, worldZ);
                temp.rotation.y = Math.random() * Math.PI * 2;
                const scale = 0.4
                temp.scale.set(scale, scale, scale);

                temp.updateMatrix();
                deerInstances.setMatrixAt(instanceCount, temp.matrix);
                instanceCount++;
            }
        }
        if (instanceCount >= MAX_DEER) break;
    }
    deerInstances.count = instanceCount;
    deerInstances.instanceMatrix.needsUpdate = true;
}

function loadTreeModel() {
    // Reset
    leafModelReady = false;
    trunkModelReady = false;
    if (leafInstances) scene.remove(leafInstances);
    if (trunkInstances) scene.remove(trunkInstances);
    leafInstances = null;
    trunkInstances = null;

    // Use the global loader instance
    loader.load("Tree low.obj", (object) => {
        if (!object.children || object.children.length < 2) {
            return; // Ensure we have at least two children
        }

        const leafGeometry = object.children[0].geometry;
        const leafMaterial = new THREE.MeshStandardMaterial({ color: "green", side: THREE.DoubleSide });

        const trunkGeometry = object.children[1].geometry;
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

        leafInstances = new THREE.InstancedMesh(leafGeometry, leafMaterial, MAX_TREES);
        leafInstances.castShadow = true;
        leafInstances.receiveShadow = true;
        scene.add(leafInstances);
        leafModelReady = true;

        trunkInstances = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, MAX_TREES);
        trunkInstances.castShadow = true;
        trunkInstances.receiveShadow = true;
        scene.add(trunkInstances);
        trunkModelReady = true;

        // Call placement check after both are potentially ready
        checkAndPlaceAssets();
    });
}

function loadDeerModel() {
    deerModelReady = false;
    if (deerInstances) scene.remove(deerInstances);
    deerInstances = null;

    const textureLoader = new THREE.TextureLoader();
    const deerTexture = textureLoader.load('textures/deer_fur.jpeg');

    console.log("Loading deer model..."); // Log start of load
    loader.load("deer.obj", (object) => {
        console.log("Deer OBJ loaded, processing..."); // Log callback entry
        if (!object.children || object.children.length === 0) { 
             console.error("Deer OBJ has no children meshes.");
             return; 
        }
        if (!object.children[0].geometry) {
             console.error("Deer OBJ child 0 has no geometry.");
             return;
        }
         console.log("Deer geometry found.");
         const deerGeometry = object.children[0].geometry; 
         const deerMaterial = new THREE.MeshStandardMaterial({ map: deerTexture });

        deerInstances = new THREE.InstancedMesh(deerGeometry, deerMaterial, MAX_DEER);
        deerInstances.castShadow = true;
        deerInstances.receiveShadow = true;
        scene.add(deerInstances);
        deerModelReady = true;
        console.log("Deer InstancedMesh created and added to scene.");

        checkAndPlaceAssets();
    }, 
    undefined, // onProgress
    (error) => { // onError
        console.error("Error loading deer.obj:", error);
    });
}

function setupMapButtons() {
    const japanButton = document.getElementById('japanBtn');
    const sriLankaButton = document.getElementById('sriLankaBtn');
    const defaultButton = document.getElementById('defaultBtn');
    const hawaiiButton = document.getElementById('hawaiiBtn');
    const worldButton = document.getElementById('worldBtn');

    japanButton.addEventListener('click', () => {loadNewTerrain('japan.png');});
    sriLankaButton.addEventListener('click', () => {loadNewTerrain('sri lanka.png');});
    defaultButton.addEventListener('click', () => {loadNewTerrain('default.png');});
    hawaiiButton.addEventListener('click', () => {loadNewTerrain('hawaii.png');});
    worldButton.addEventListener('click', () => {loadNewTerrain('world.png');});
}

function loadNewTerrain(mapFilename) {
    terrainReady = false; 
    if (terrainMesh) {
        scene.remove(terrainMesh);
        if(terrainMesh.geometry) terrainMesh.geometry.dispose();
        if(terrainMesh.material) {
             if (Array.isArray(terrainMesh.material)) {
                  terrainMesh.material.forEach(m => m.dispose());
             } else {
                  terrainMesh.material.dispose();
             }
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

    currentHeightMapUrl = "textures/" + mapFilename;
    const biomeMapUrl = "textures/" + mapFilename.split(".")[0] + "-biome.png";
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(currentHeightMapUrl,
        (heightMapTexture) => {
            textureLoader.load(biomeMapUrl,
                (biomeMapTexture) => {
                    createTerrain(heightMapTexture, biomeMapTexture);
                }
            );
        },
    );
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
    const canvas = document.createElement('canvas');
    canvas.width = imgWidth;
    canvas.height = imgHeight;
    const context = canvas.getContext('2d', {willReadFrequently: true});
    context.drawImage(img, 0, 0);
    const imgData = context.getImageData(0, 0, imgWidth, imgHeight).data;

    // Use another canvas to access biome information
    const biomeCanvas = document.createElement('canvas');
    biomeCanvas.width = imgWidth;
    biomeCanvas.height = imgHeight;
    const biomeContext = biomeCanvas.getContext('2d', {willReadFrequently: true});
    biomeContext.drawImage(biomeImg, 0, 0);
    const biomeData = biomeContext.getImageData(0, 0, imgWidth, imgHeight).data;

    // Subtract 1 from both img width and height to count segments, not vertices
    const geometry = new THREE.PlaneGeometry(TERRAIN_WIDTH, TERRAIN_HEIGHT, imgWidth - 1, imgHeight - 1);

    const vertices = geometry.attributes.position.array;
    const colours = new Float32Array(vertices.length);
    // Biome map keeps track of the biome of each pixel without having to use the image to look it up
    biomeMap = new Array(imgHeight);

    for (let i = 0; i < imgHeight; i++) {
        biomeMap[i] = new Array(imgWidth);
    }

    let vertexColour = new THREE.Color();
    // For each pixel in the heightmap, adjust the vertex height
    for (let y = 0; y < imgHeight; y++) {
        for (let x = 0; x < imgWidth; x++) {
            const pixelIndex = (y * imgWidth + x) * 4; // Each pixel has 4 parts: RGBA
            const vertexIndex = (y * imgWidth + x) * 3; // Each vertex has 3 parts: X, Y, Z

            // Change the z component (vertex index + 2)
            let height = (imgData[pixelIndex] / 255) * TERRAIN_DEPTH_SCALE;
            if (height < 1) {
                height = -40;
            }
            vertices[vertexIndex + 2] = height;
            const biomeId = (biomeData[pixelIndex] << 16) | (biomeData[pixelIndex + 1] << 8) | biomeData[pixelIndex + 2];
            biomeMap[y][x] = biomeId;
            switch(biomeId) {
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

    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));

    // Recalculate normals
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({vertexColors: true, side: THREE.FrontSide});

    terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.rotation.x = -Math.PI / 2;
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add(terrainMesh);

    console.log("Terrain created and added to scene.");
    terrainReady = true;
    checkAndPlaceAssets(); // Use check function here
}

function createWater() {
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000); // Very large plane
    const waterMaterial = new THREE.MeshPhongMaterial({color: 0x006994, shininess: 60});

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
            case 'KeyW':
                controls.moveForward(speed);
                break;
            case 'KeyA':
                controls.moveRight(-speed);
                break;
            case 'KeyS':
                controls.moveForward(-speed);
                break;
            case 'KeyD':
                controls.moveRight(speed);
                break;
            case 'Space':
                controls.getObject().position.y += speed;
                break;
            case 'ShiftLeft':
            case 'KeyQ':
                controls.getObject().position.y -= speed;
                break;
        }   
    }
}
