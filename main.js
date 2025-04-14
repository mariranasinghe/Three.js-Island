let scene, camera, renderer, controls;
let terrainMesh;
let currentHeightMapUrl = 'japan.png';

const TERRAIN_WIDTH = 1000;
const TERRAIN_HEIGHT = 1000;
const TERRAIN_DEPTH_SCALE = 150; // Scaling factor
const TERRAIN_OFFSET = 16;


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

    // Use pointer lock controls
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
    loadNewTerrain('japan.png');
    createWater();
    setupMapButtons();
    window.addEventListener('resize', onWindowResize, false);
}

function setupMapButtons() {
    const japanButton = document.getElementById('japanBtn');
    const sriLankaButton = document.getElementById('sriLankaBtn');
    const irelandButton = document.getElementById('irelandBtn');
    const hawaiiButton = document.getElementById('hawaiiBtn');

    japanButton.addEventListener('click', () => {loadNewTerrain('japan.png');});
    sriLankaButton.addEventListener('click', () => {loadNewTerrain('sri lanka.png');});
    irelandButton.addEventListener('click', () => {loadNewTerrain('ireland.png');});
    hawaiiButton.addEventListener('click', () => {loadNewTerrain('hawaii.png');});
}

function loadNewTerrain(mapFilename) {
    if (terrainMesh) {
        // Remove previous mesh if it exists
        scene.remove(terrainMesh);
    }

    currentHeightMapUrl = "textures/" + mapFilename;
    console.log(currentHeightMapUrl);

    const loader = new THREE.TextureLoader();
    loader.load(currentHeightMapUrl, function(texture) {createTerrain(texture);});
}


function createTerrain(heightMapTexture) {
    const img = heightMapTexture.image;
    const imgWidth = img.width;
    const imgHeight = img.height;

    // Use canvas to access pixel information
    const canvas = document.createElement('canvas');
    canvas.width = imgWidth;
    canvas.height = imgHeight;
    const context = canvas.getContext('2d', {willReadFrequently: true});
    context.drawImage(img, 0, 0);
    const imgData = context.getImageData(0, 0, imgWidth, imgHeight).data;

    // Subtract 1 from both img width and height to count segments, not vertices
    const geometry = new THREE.PlaneGeometry(TERRAIN_WIDTH, TERRAIN_HEIGHT, imgWidth - 1, imgHeight - 1);

    const vertices = geometry.attributes.position.array;

    // For each pixel in the heightmap, adjust the vertex height
    for (let y = 0; y < imgHeight; y++) {
        for (let x = 0; x < imgWidth; x++) {
            const heightIndex = (y * imgWidth + x) * 4; // Each pixel has 4 parts: RGBA
            const vertexIndex = (y * imgWidth + x) * 3; // Each vertex has 3 parts: X, Y, Z

            // Change the z component (vertex index + 2)
            vertices[vertexIndex + 2] = (imgData[heightIndex] / 255) * TERRAIN_DEPTH_SCALE - TERRAIN_OFFSET;
        }
    }

    // Recalculate normals
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: 0x66bb22, side: THREE.FrontSide});

    terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.rotation.x = -Math.PI / 2;
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add(terrainMesh);
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


function onKeyDown(event) {
    if (controls.isLocked) {

        const speed = 2;

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
