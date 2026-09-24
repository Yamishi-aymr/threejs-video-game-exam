import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';



// ELEMENTOS HTML


const sceneContainer = document.getElementById('scene-container');

const loadingScreen = document.getElementById('loading-screen');

const loadingProgress = document.getElementById('loading-progress');

const loadingMessage = document.getElementById('loading-message');

const gameStateElement = document.getElementById('game-state');


// ESCENA

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x080b0e);

scene.fog = new THREE.Fog(
    0x080b0e,
    30,
    85
);


// CÁMARA

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    300
);

camera.position.set(
    9,
    7,
    12
);


// RENDERER

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
});

renderer.setPixelRatio(
    Math.min(
        window.devicePixelRatio,
        2
    )
);

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.shadowMap.enabled = true;

renderer.shadowMap.type = THREE.PCFShadowMap;

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.05;

sceneContainer.appendChild(
    renderer.domElement
);


// ORBIT CONTROLS

const controls = new OrbitControls(
    camera,
    renderer.domElement
);

controls.enableDamping = true;

controls.dampingFactor = 0.06;

controls.enablePan = false;

controls.minDistance = 4;

controls.maxDistance = 30;

controls.maxPolarAngle = Math.PI / 2.05;

controls.target.set(
    0,
    1,
    0
);


// ILUMINACIÓN

// Luz ambiental

const hemisphereLight = new THREE.HemisphereLight(
    0xbad8ff,
    0x111417,
    1.6
);

scene.add(
    hemisphereLight
);


// Luz principal

const directionalLight = new THREE.DirectionalLight(
    0xffffff,
    2.8
);

directionalLight.position.set(
    8,
    15,
    10
);

directionalLight.castShadow = true;

directionalLight.shadow.mapSize.set(
    2048,
    2048
);

directionalLight.shadow.camera.left = -20;

directionalLight.shadow.camera.right = 20;

directionalLight.shadow.camera.top = 20;

directionalLight.shadow.camera.bottom = -20;

directionalLight.shadow.camera.near = 0.1;

directionalLight.shadow.camera.far = 50;

scene.add(
    directionalLight
);


// Luz verde decorativa

const reactorLight = new THREE.PointLight(
    0x40ff9d,
    18,
    18,
    2
);

reactorLight.position.set(
    0,
    3,
    0
);

scene.add(
    reactorLight
);


// PISO TEMPORAL

const floorGeometry = new THREE.PlaneGeometry(
    40,
    40
);

const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x151a1d,
    roughness: 0.9,
    metalness: 0.1
});

const floor = new THREE.Mesh(
    floorGeometry,
    floorMaterial
);

floor.rotation.x = -Math.PI / 2;

floor.receiveShadow = true;

scene.add(
    floor
);


// GRID

const gridHelper = new THREE.GridHelper(
    40,
    40,
    0x40ff9d,
    0x293134
);

gridHelper.position.y = 0.01;

scene.add(
    gridHelper
);


// OBJETO CENTRAL TEMPORAL

const reactorGroup = new THREE.Group();

scene.add(
    reactorGroup
);


// Base

const baseGeometry = new THREE.CylinderGeometry(
    2.2,
    2.5,
    0.5,
    32
);

const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x161c20,
    roughness: 0.45,
    metalness: 0.75
});

const base = new THREE.Mesh(
    baseGeometry,
    baseMaterial
);

base.position.y = 0.25;

base.castShadow = true;

base.receiveShadow = true;

reactorGroup.add(
    base
);


// Núcleo

const coreGeometry = new THREE.IcosahedronGeometry(
    1,
    3
);

const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0x40ff9d,
    emissive: 0x18aa60,
    emissiveIntensity: 2.5,
    roughness: 0.25,
    metalness: 0.15
});

const core = new THREE.Mesh(
    coreGeometry,
    coreMaterial
);

core.position.y = 2;

core.castShadow = true;

reactorGroup.add(
    core
);


// Anillos

const ringMaterial = new THREE.MeshStandardMaterial({
    color: 0xc5d1d8,
    metalness: 0.85,
    roughness: 0.25
});

for (let i = 0; i < 3; i++) {

    const ringGeometry = new THREE.TorusGeometry(
        1.55 + (i * 0.25),
        0.035,
        12,
        64
    );

    const ring = new THREE.Mesh(
        ringGeometry,
        ringMaterial
    );

    ring.position.y = 2;

    ring.rotation.x = Math.PI / 2;

    ring.rotation.y = i * 0.65;

    reactorGroup.add(
        ring
    );

}


// OBJETOS TEMPORALES

function createTestBox(
    x,
    y,
    z,
    width,
    height,
    depth
) {

    const geometry = new THREE.BoxGeometry(
        width,
        height,
        depth
    );

    const material = new THREE.MeshStandardMaterial({
        color: 0x262e33,
        roughness: 0.65,
        metalness: 0.25
    });

    const box = new THREE.Mesh(
        geometry,
        material
    );

    box.position.set(
        x,
        y,
        z
    );

    box.castShadow = true;

    box.receiveShadow = true;

    scene.add(
        box
    );

    return box;

}


createTestBox(
    -4,
    0.75,
    -3,
    1.5,
    1.5,
    1.5
);

createTestBox(
    4,
    1,
    -4,
    2,
    2,
    2
);

createTestBox(
    -5,
    0.5,
    4,
    1,
    1,
    1
);

createTestBox(
    5,
    1.5,
    3,
    2,
    3,
    1
);


// RELOJ THREE.JS
const timer = new THREE.Timer();

timer.connect(document);


// SIMULACIÓN DE CARGA INICIAL

function initializeLoadingScreen() {

    loadingProgress.style.width = '25%';

    loadingMessage.textContent =
        'Inicializando motor gráfico...';


    setTimeout(() => {

        loadingProgress.style.width = '55%';

        loadingMessage.textContent =
            'Configurando iluminación...';

    }, 250);


    setTimeout(() => {

        loadingProgress.style.width = '80%';

        loadingMessage.textContent =
            'Preparando simulación...';

    }, 500);


    setTimeout(() => {

        loadingProgress.style.width = '100%';

        loadingMessage.textContent =
            'Sistema listo';

    }, 750);


    setTimeout(() => {

        loadingScreen.classList.add(
            'hidden'
        );

        gameStateElement.textContent =
            'SISTEMA LISTO';

    }, 1100);

}


// RESIZE

function handleResize() {

    camera.aspect =
        window.innerWidth /
        window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
    );

}

window.addEventListener(
    'resize',
    handleResize
);


// ANIMACIÓN

function animate() {

    requestAnimationFrame(
        animate
    );


    timer.update();

    const deltaTime =
        timer.getDelta();

    const elapsedTime =
        timer.getElapsed();

    // Rotación suave del núcleo

    core.rotation.x +=
        deltaTime * 0.2;

    core.rotation.y +=
        deltaTime * 0.35;


    // Flotación

    core.position.y =
        2 +
        Math.sin(
            elapsedTime * 1.6
        ) * 0.08;


    // Pulso de luz

    reactorLight.intensity =
        17 +
        Math.sin(
            elapsedTime * 2
        ) * 3;


    // Anillos

    reactorGroup.children.forEach(
        (child, index) => {

            if (
                child.geometry &&
                child.geometry.type ===
                'TorusGeometry'
            ) {

                child.rotation.z +=
                    deltaTime *
                    (
                        0.2 +
                        index * 0.04
                    );

            }

        }
    );


    controls.update();


    renderer.render(
        scene,
        camera
    );

}


// INICIAR APLICACIÓN

initializeLoadingScreen();

animate();