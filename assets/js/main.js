import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import {
    loadPlayer,
    updatePlayer
} from './player.js';


  
// ELEMENTOS HTML
  

const sceneContainer =
    document.getElementById('scene-container');

const loadingScreen =
    document.getElementById('loading-screen');

const loadingProgress =
    document.getElementById('loading-progress');

const loadingMessage =
    document.getElementById('loading-message');

const gameStateElement =
    document.getElementById('game-state');


  
// ESCENA
  

const scene = new THREE.Scene();

scene.background = new THREE.Color(
    0x080b0e
);

scene.fog = new THREE.Fog(
    0x080b0e,
    40,
    130
);


  
// CÁMARA
  

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
);

camera.position.set(
    12,
    8,
    18
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

renderer.shadowMap.type =
    THREE.PCFShadowMap;

renderer.outputColorSpace =
    THREE.SRGBColorSpace;

renderer.toneMapping =
    THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure =
    1.1;

sceneContainer.appendChild(
    renderer.domElement
);


  
// CÁMARA / ORBIT CONTROLS
  

const controls = new OrbitControls(
    camera,
    renderer.domElement
);

controls.enableDamping = true;

controls.dampingFactor = 0.06;

controls.enablePan = false;

controls.enableZoom = true;

controls.minDistance = 2;

controls.maxDistance = 80;

controls.maxPolarAngle =
    Math.PI / 2.05;

controls.target.set(
    0,
    2,
    0
);


  
// ILUMINACIÓN
  

// Luz ambiental general

const ambientLight =
    new THREE.AmbientLight(
        0xffffff,
        0.7
    );

scene.add(
    ambientLight
);


// Luz hemisférica

const hemisphereLight =
    new THREE.HemisphereLight(
        0xc9e2ff,
        0x191b1c,
        1.4
    );

scene.add(
    hemisphereLight
);


// Luz principal

const directionalLight =
    new THREE.DirectionalLight(
        0xffffff,
        2.2
    );

directionalLight.position.set(
    15,
    25,
    15
);

directionalLight.castShadow = true;

directionalLight.shadow.mapSize.set(
    2048,
    2048
);

directionalLight.shadow.camera.left =
    -35;

directionalLight.shadow.camera.right =
    35;

directionalLight.shadow.camera.top =
    35;

directionalLight.shadow.camera.bottom =
    -35;

directionalLight.shadow.camera.near =
    0.5;

directionalLight.shadow.camera.far =
    100;

directionalLight.shadow.bias =
    -0.0002;

scene.add(
    directionalLight
);


// Luz decorativa verde

const reactorLight =
    new THREE.PointLight(
        0x40ff9d,
        5,
        22,
        2
    );

reactorLight.position.set(
    0,
    5,
    0
);

scene.add(
    reactorLight
);


  
// ESCENARIO
  

let environment = null;

let environmentBounds = null;

  
// TEMPORIZADOR
  

const timer =
    new THREE.Timer();

timer.connect(
    document
);


  
// CARGAR ESCENARIO GLB
  

function loadEnvironment() {

    loadingProgress.style.width =
        '10%';

    loadingMessage.textContent =
        'Cargando instalación...';

    gameStateElement.textContent =
        'CARGANDO';


    const loader =
        new GLTFLoader();


    loader.load(

        './assets/models/environment/kitchen_and_lab.glb',


        // ====================================================
        // MODELO CARGADO
        // ====================================================

        (gltf) => {

            environment =
                gltf.scene;


            // -----------------------------------------------
            // CONFIGURACIÓN DE MALLAS
            // -----------------------------------------------

            let meshCount = 0;


            environment.traverse(
                (object) => {

                    if (
                        object.isMesh
                    ) {

                        meshCount++;


                        // =================================================
                        // OCULTAR PAREDES ROSAS DEL MODELO ORIGINAL
                        // =================================================

                        if (
                            object.name.includes(
                                'WallCinematicaIntroduccion'
                            )
                        ) {

                            object.visible = true;

                            object.material =
                                new THREE.MeshStandardMaterial({
                                    color: 0x70777a,
                                    roughness: 0.85,
                                    metalness: 0.05
                                });

                            console.log(
                                '🎨 Material corregido:',
                                object.name
                            );
                        }
                        // CONFIGURACIÓN GENERAL
                        object.castShadow = false;

                        object.receiveShadow = true;

                        object.frustumCulled = true;

                    }

                }
            );


            // -----------------------------------------------
            // CALCULAR LÍMITES DEL MODELO
            // -----------------------------------------------

            let box =
                new THREE.Box3()
                    .setFromObject(
                        environment
                    );


            const center =
                box.getCenter(
                    new THREE.Vector3()
                );


            // -----------------------------------------------
            // CENTRAR ESCENARIO EN X Y Z
            // -----------------------------------------------

            environment.position.x -=
                center.x;

            environment.position.z -=
                center.z;


            // -----------------------------------------------
            // COLOCAR EL PISO EN Y = 0
            // -----------------------------------------------

            environment.position.y -=
                box.min.y;


            // -----------------------------------------------
            // AGREGAR ESCENARIO
            // -----------------------------------------------

            scene.add(
                environment
            );


            // -----------------------------------------------
            // RECALCULAR LÍMITES
            // -----------------------------------------------

            box =
                new THREE.Box3()
                    .setFromObject(
                        environment
                    );


            environmentBounds =
                box;


            const size =
                box.getSize(
                    new THREE.Vector3()
                );


            const newCenter =
                box.getCenter(
                    new THREE.Vector3()
                );
            // -----------------------------------------------
            // CARGAR PERSONAJE
            // -----------------------------------------------

            const playerSpawn =
                new THREE.Vector3(
                    6.66,
                    6.91,
                    12.10
                );

            loadPlayer(
                scene,
                playerSpawn
            )
                .then(
                    (player) => {

                        console.log(
                            '📍 Personaje colocado en:',
                            player.position
                        );


                        // ---------------------------------------
                        // CÁMARA TEMPORAL SOBRE EL PERSONAJE
                        // ---------------------------------------

                        // ---------------------------------------
                        // CÁMARA EN TERCERA PERSONA
                        // ---------------------------------------

                        camera.position.set(
                            player.position.x,
                            player.position.y + 2.2,
                            player.position.z + 4.5
                        );

                        controls.target.set(
                            player.position.x,
                            player.position.y + 1.1,
                            player.position.z
                        );

                        // Evitar que la cámara se aleje demasiado
                        controls.minDistance = 2.5;
                        controls.maxDistance = 6;

                        // Evitar que pueda meterse demasiado debajo del personaje
                        controls.minPolarAngle = 0.35;
                        controls.maxPolarAngle = Math.PI / 2.05;

                        controls.update();
                    }
                )
                .catch(
                    (error) => {

                        console.error(
                            '❌ No fue posible iniciar al personaje:',
                            error
                        );

                    }
                );



            // -----------------------------------------------
            // AJUSTAR CÁMARA AUTOMÁTICAMENTE
            // -----------------------------------------------

            configureCameraForEnvironment(
                size,
                newCenter
            );


            // -----------------------------------------------
            // AJUSTAR NIEBLA
            // -----------------------------------------------

            const maxDimension =
                Math.max(
                    size.x,
                    size.y,
                    size.z
                );


            scene.fog.near =
                maxDimension * 0.8;

            scene.fog.far =
                maxDimension * 3;


            // -----------------------------------------------
            // AJUSTAR LUZ PRINCIPAL
            // -----------------------------------------------

            directionalLight.position.set(
                maxDimension * 0.4,
                maxDimension * 0.7,
                maxDimension * 0.4
            );


            // -----------------------------------------------
            // INFORMACIÓN EN CONSOLA
            // -----------------------------------------------

            console.log(
                '✅ Escenario cargado correctamente'
            );

            console.log(
                '📦 Modelo:',
                'kitchen_and_lab.glb'
            );

            console.log(
                '🧩 Mallas encontradas:',
                meshCount
            );

            console.log(
                '📐 Tamaño del escenario:',
                {
                    ancho:
                        size.x.toFixed(2),

                    alto:
                        size.y.toFixed(2),

                    profundidad:
                        size.z.toFixed(2)
                }
            );


            // -----------------------------------------------
            // FINALIZAR CARGA
            // -----------------------------------------------

            loadingProgress.style.width =
                '100%';

            loadingMessage.textContent =
                'Instalación preparada';

            gameStateElement.textContent =
                'ESCENARIO LISTO';


            setTimeout(
                () => {

                    loadingScreen.classList.add(
                        'hidden'
                    );

                },
                500
            );

        },


        // ====================================================
        // PROGRESO DE CARGA
        // ====================================================

        (xhr) => {

            if (
                xhr.lengthComputable
            ) {

                const percent =
                    Math.round(
                        (
                            xhr.loaded /
                            xhr.total
                        ) * 100
                    );


                loadingProgress.style.width =
                    `${percent}%`;


                loadingMessage.textContent =
                    `Cargando instalación... ${percent}%`;

            } else {

                loadingMessage.textContent =
                    'Cargando instalación...';

            }

        },


        // ====================================================
        // ERROR
        // ====================================================

        (error) => {

            console.error(
                '❌ Error cargando el escenario:',
                error
            );


            loadingMessage.textContent =
                'Error al cargar el escenario';

            gameStateElement.textContent =
                'ERROR';


            loadingProgress.style.width =
                '100%';

            loadingProgress.style.background =
                '#ff445a';

        }

    );

}

  
// AJUSTAR CÁMARA AL ESCENARIO
  

function configureCameraForEnvironment(
    size,
    center
) {

    const maxDimension =
        Math.max(
            size.x,
            size.y,
            size.z
        );


    // Posición inicial elevada
    // para poder revisar el escenario completo

    camera.position.set(

        center.x +
        maxDimension * 0.55,

        center.y +
        maxDimension * 0.35,

        center.z +
        maxDimension * 0.7

    );


    // La cámara mira aproximadamente
    // al centro del edificio

    controls.target.set(

        center.x,

        Math.max(
            1.5,
            size.y * 0.25
        ),

        center.z

    );


    controls.minDistance =
        2;

    controls.maxDistance =
        maxDimension * 2;


    camera.near =
        0.1;

    camera.far =
        Math.max(
            500,
            maxDimension * 10
        );


    camera.updateProjectionMatrix();


    controls.update();

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
  
// SEGUIMIENTO DE CÁMARA EN TERCERA PERSONA
  

const cameraTargetOffset =
    new THREE.Vector3(
        0,
        1.1,
        0
    );

const desiredCameraTarget =
    new THREE.Vector3();

const cameraMovement =
    new THREE.Vector3();


function updateThirdPersonCamera(
    player
) {

    if (
        !player
    ) {

        return;

    }


    // Punto que debe seguir la cámara

    desiredCameraTarget
        .copy(
            player.position
        )
        .add(
            cameraTargetOffset
        );


    // Cuánto se desplazó el personaje

    cameraMovement
        .copy(
            desiredCameraTarget
        )
        .sub(
            controls.target
        );


    // Mover cámara junto con el personaje

    camera.position.add(
        cameraMovement
    );


    // Nuevo objetivo de OrbitControls

    controls.target.copy(
        desiredCameraTarget
    );

}

  
// LOOP DE ANIMACIÓN
  

function animate() {

    requestAnimationFrame(
        animate
    );


    // ========================================================
    // TIEMPO
    // ========================================================

    timer.update();


    const deltaTime =
        timer.getDelta();


    // ========================================================
    // PERSONAJE
    // ========================================================

    const activePlayer =
        updatePlayer(
            deltaTime,
            camera
        );


    // ========================================================
    // CÁMARA TERCERA PERSONA
    // ========================================================

    updateThirdPersonCamera(
        activePlayer
    );


    controls.update();


    // ========================================================
    // RENDER
    // ========================================================

    renderer.render(
        scene,
        camera
    );

}


  
// INICIAR APLICACIÓN
  

loadEnvironment();

animate();