import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import {

    loadPlayer,

    updatePlayer,

    setThrowStartCallback,

    setThrowReleaseCallback

} from './player.js';

import {

    initPhysics,

    stepPhysics,

    createEnvironmentCollider,

    createPlayerPhysics,

    getPhysicsWorld,

    getRapier

} from './physics.js';

import {

    prepareDoorsForExploration

} from './doors.js';

import {

    createHeldProjectile,

    releaseHeldProjectile,

    updateProjectiles

} from './projectiles.js';


import {

    createMissionCores,

    updateCores

} from './cores.js';

// ============================================================

// ELEMENTOS HTML

// ============================================================

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

// ============================================================

// ESCENA

// ============================================================

const scene = new THREE.Scene();

scene.background =

    new THREE.Color(0x080b0e);

scene.fog =

    new THREE.Fog(

        0x080b0e,

        40,

        130

    );

// ============================================================

// CÁMARA

// ============================================================

const camera =

    new THREE.PerspectiveCamera(

        60,

        window.innerWidth / window.innerHeight,

        0.15,

        150

    );

camera.position.set(

    12,

    8,

    18

);

// ============================================================

// THROW - PELOTA EN LA MANO

// ============================================================

setThrowStartCallback(

    (player) => {

        createHeldProjectile(

            scene,

            player

        );

    }

);

// ============================================================

// THROW - SOLTAR PELOTA

// ============================================================

setThrowReleaseCallback(

    () => {

        releaseHeldProjectile(

            scene,

            camera

        );

    }

);

// ============================================================

// RENDERER

// ============================================================

const renderer =

    new THREE.WebGLRenderer({

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

// ============================================================
// ORBIT CONTROLS
// ============================================================

const controls =
    new OrbitControls(
        camera,
        renderer.domElement
    );

// OrbitControls siempre permanece disponible.
//
// La cámara acompaña la POSICIÓN del personaje,
// pero ya NO persigue automáticamente cada giro.
//
// Esto evita movimientos bruscos al usar WASD y permite
// inspeccionar el escenario incluso mientras caminas.
controls.enableDamping = true;
controls.dampingFactor = 0.06;

controls.enablePan = false;
controls.enableZoom = true;
controls.enableRotate = true;

controls.minDistance = 2.2;
controls.maxDistance = 5.0;

controls.minPolarAngle = 0.35;
controls.maxPolarAngle =
    Math.PI / 2.05;

controls.target.set(
    0,
    2,
    0
);

// ============================================================

// ILUMINACIÓN

// ============================================================

// Luz ambiental

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

directionalLight.shadow.camera.left = -35;

directionalLight.shadow.camera.right = 35;

directionalLight.shadow.camera.top = 35;

directionalLight.shadow.camera.bottom = -35;

directionalLight.shadow.camera.near = 0.5;

directionalLight.shadow.camera.far = 100;

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

// ============================================================

// ESCENARIO

// ============================================================

let environment = null;

// ============================================================

// TEMPORIZADOR

// ============================================================

const timer =

    new THREE.Timer();

timer.connect(

    document

);

// ============================================================

// CARGAR ESCENARIO GLB

// ============================================================

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

            // =================================================

            // CONFIGURACIÓN DE MALLAS

            // =================================================

            environment.traverse(

                (object) => {

                    if (

                        !object.isMesh

                    ) {

                        return;

                    }

                    // -----------------------------------------

                    // CORREGIR PAREDES ROSAS DEL MODELO

                    // -----------------------------------------

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

                    }

                    // -----------------------------------------

                    // CONFIGURACIÓN GENERAL

                    // -----------------------------------------

                    object.castShadow = false;

                    object.receiveShadow = true;

                    object.frustumCulled = true;

                }

            );

            // =================================================

            // CALCULAR LÍMITES INICIALES

            // =================================================

            let box =

                new THREE.Box3()

                    .setFromObject(

                        environment

                    );

            const center =

                box.getCenter(

                    new THREE.Vector3()

                );

            // =================================================

            // CENTRAR ESCENARIO

            // =================================================

            environment.position.x -=

                center.x;

            environment.position.z -=

                center.z;

            // Colocar la parte inferior del escenario en Y = 0

            environment.position.y -=

                box.min.y;

            scene.add(

                environment

            );

            // =================================================

            // PREPARAR PUERTAS TRANSITABLES

            // =================================================

            prepareDoorsForExploration(

                environment

            );

            // =================================================

            // ACTUALIZAR MATRICES

            // =================================================

            environment.updateMatrixWorld(

                true

            );

            // =================================================

            // CREAR COLLIDER DEL ESCENARIO

            // =================================================

            createEnvironmentCollider(

                environment

            );

            // =================================================

            // RECALCULAR LÍMITES DEL ESCENARIO

            // =================================================

            box =

                new THREE.Box3()

                    .setFromObject(

                        environment

                    );

            const size =

                box.getSize(

                    new THREE.Vector3()

                );

            const newCenter =

                box.getCenter(

                    new THREE.Vector3()

                );

            // =================================================

            // CARGAR PERSONAJE

            // =================================================

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

                        // -------------------------------------

                        // CREAR FÍSICA DEL PERSONAJE

                        // -------------------------------------

                        createPlayerPhysics(

                            player.position

                        );


                        // -------------------------------------
                        // 5 NÚCLEOS DE LA MISIÓN
                        // -------------------------------------

                        createMissionCores(
                            scene,
                            player
                        );

                        // -------------------------------------
// CÁMARA EN TERCERA PERSONA
// -------------------------------------

// Colocar inmediatamente la cámara detrás
// del personaje cuando termina de cargar.
snapCameraBehindPlayer(
    player
);

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

            // =================================================

            // AJUSTAR CÁMARA AL ESCENARIO DURANTE LA CARGA

            // =================================================

            configureCameraForEnvironment(

                size,

                newCenter

            );

            // =================================================

            // AJUSTAR NIEBLA

            // =================================================

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

            // =================================================

            // AJUSTAR LUZ PRINCIPAL

            // =================================================

            directionalLight.position.set(

                maxDimension * 0.4,

                maxDimension * 0.7,

                maxDimension * 0.4

            );

            console.log(

                '✅ Escenario cargado correctamente'

            );

            console.log(

                '📦 Modelo: kitchen_and_lab.glb'

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

            // =================================================

            // FINALIZAR CARGA

            // =================================================

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

// ============================================================

// AJUSTAR CÁMARA AL ESCENARIO

// ============================================================

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

    camera.position.set(

        center.x +

        maxDimension * 0.55,

        center.y +

        maxDimension * 0.35,

        center.z +

        maxDimension * 0.7

    );

    controls.target.set(

        center.x,

        Math.max(

            1.5,

            size.y * 0.25

        ),

        center.z

    );

    controls.minDistance = 2;

    controls.maxDistance =

        maxDimension * 2;

    // Mejor precisión de profundidad sin usar un far excesivo.

    camera.near = 0.15;

    camera.far =

        Math.max(

            150,

            maxDimension * 4

        );

    camera.updateProjectionMatrix();

    controls.update();

}

// ============================================================

// RESIZE

// ============================================================

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

// ============================================================
// CÁMARA EN TERCERA PERSONA - SEGUIMIENTO ESTABLE
// ============================================================
//
// NUEVO COMPORTAMIENTO:
//
// - La cámara inicia detrás del personaje.
// - Al caminar, sigue solamente su POSICIÓN.
// - NO gira automáticamente cada vez que el personaje gira.
// - OrbitControls permanece activo siempre.
// - El jugador puede inspeccionar la habitación caminando.
// - La cámara conserva el ángulo elegido por el usuario.
//
// Esto reduce mucho la sensación de mareo.
// ============================================================


// Distancia inicial detrás del personaje.
const CAMERA_DISTANCE =
    4.2;


// Altura inicial de la cámara.
const CAMERA_HEIGHT =
    1.9;


// Altura aproximada del torso.
const CAMERA_TARGET_HEIGHT =
    1.25;


// La mira comienza ligeramente por delante
// del personaje.
const CAMERA_LOOK_AHEAD =
    1.15;


// ============================================================
// VECTORES REUTILIZABLES
// ============================================================

const playerForward =
    new THREE.Vector3();


const playerBackward =
    new THREE.Vector3();


const desiredCameraPosition =
    new THREE.Vector3();


const desiredCameraTarget =
    new THREE.Vector3();


// Desplazamiento real del personaje entre frames.
const playerFrameMovement =
    new THREE.Vector3();


// Última posición conocida.
const previousPlayerPosition =
    new THREE.Vector3();


// ¿Ya tenemos posición inicial?
let cameraTrackingInitialized =
    false;


// ============================================================
// OBTENER DIRECCIÓN FRONTAL DEL PERSONAJE
// ============================================================
//
// Solo se utiliza para colocar la cámara inicialmente.
// Después de comenzar el juego, la cámara ya no persigue
// automáticamente esta rotación.
// ============================================================

function getPlayerForward(
    player
) {

    playerForward.set(
        0,
        0,
        1
    );


    playerForward.applyQuaternion(
        player.quaternion
    );


    playerForward.y =
        0;


    if (
        playerForward.lengthSq() >
        0.000001
    ) {

        playerForward.normalize();

    } else {

        playerForward.set(
            0,
            0,
            1
        );

    }


    return playerForward;

}


// ============================================================
// COLOCAR CÁMARA INICIAL DETRÁS DEL PERSONAJE
// ============================================================

function snapCameraBehindPlayer(
    player
) {

    if (
        !player
    ) {

        return;

    }


    const forward =
        getPlayerForward(
            player
        );


    playerBackward
        .copy(
            forward
        )
        .multiplyScalar(
            -1
        );


    // ========================================================
    // POSICIÓN INICIAL
    // ========================================================

    desiredCameraPosition
        .copy(
            player.position
        )
        .addScaledVector(
            playerBackward,
            CAMERA_DISTANCE
        );


    desiredCameraPosition.y +=
        CAMERA_HEIGHT;


    // ========================================================
    // OBJETIVO INICIAL
    // ========================================================

    desiredCameraTarget
        .copy(
            player.position
        );


    desiredCameraTarget.y +=
        CAMERA_TARGET_HEIGHT;


    desiredCameraTarget.addScaledVector(
        forward,
        CAMERA_LOOK_AHEAD
    );


    camera.position.copy(
        desiredCameraPosition
    );


    controls.target.copy(
        desiredCameraTarget
    );


    // Guardar posición para empezar el seguimiento.
    previousPlayerPosition.copy(
        player.position
    );


    cameraTrackingInitialized =
        true;


    // OrbitControls siempre disponible.
    controls.enableRotate =
        true;

    controls.enableZoom =
        true;


    controls.update();

}


// ============================================================
// ACTUALIZAR CÁMARA EN TERCERA PERSONA
// ============================================================
//
// En lugar de recalcular la cámara usando la rotación
// del personaje, trasladamos la cámara exactamente la misma
// distancia que se movió el jugador.
//
// Ejemplo:
//
// FRAME 1:
//
//       👤
//        \
//         🎥
//
// El jugador avanza:
//
//          👤
//           \
//            🎥
//
// Tanto la cámara como su target se desplazaron juntos,
// por lo que el ángulo de visión NO cambia.
//
// Si el usuario mueve el mouse, OrbitControls modifica
// libremente ese ángulo.
// ============================================================

function updateThirdPersonCamera(
    player
) {

    if (
        !player
    ) {

        return;

    }


    // ========================================================
    // PRIMER FRAME
    // ========================================================

    if (
        !cameraTrackingInitialized
    ) {

        previousPlayerPosition.copy(
            player.position
        );


        cameraTrackingInitialized =
            true;


        return;

    }


    // ========================================================
    // CUÁNTO SE MOVIÓ EL PERSONAJE
    // ========================================================

    playerFrameMovement
        .copy(
            player.position
        )
        .sub(
            previousPlayerPosition
        );


    // ========================================================
    // MOVER CÁMARA Y TARGET JUNTOS
    // ========================================================
    //
    // Esto conserva:
    //
    // - distancia,
    // - altura,
    // - ángulo,
    // - orientación elegida con OrbitControls.
    //
    // ========================================================

    if (
        playerFrameMovement.lengthSq() >
        0.00000001
    ) {

        camera.position.add(
            playerFrameMovement
        );


        controls.target.add(
            playerFrameMovement
        );

    }


    // ========================================================
    // GUARDAR POSICIÓN PARA EL SIGUIENTE FRAME
    // ========================================================

    previousPlayerPosition.copy(
        player.position
    );


    // OrbitControls nunca se bloquea.
    controls.enableRotate =
        true;

    controls.enableZoom =
        true;

}

// ============================================================

// COLISIÓN DE CÁMARA

// ============================================================

const CAMERA_WALL_MARGIN = 0.45;

const CAMERA_COLLISION_MIN_DISTANCE =

    0.65;

// Distancia máxima hacia abajo para buscar piso

const CAMERA_FLOOR_CHECK_DISTANCE =

    4.5;

const CAMERA_SEARCH_STEP = 0.20;

const cameraRayDirection =

    new THREE.Vector3();

const cameraSafePosition =

    new THREE.Vector3();

const cameraCandidatePosition =

    new THREE.Vector3();

// ============================================================

// COMPROBAR SI HAY PISO DEBAJO DE LA CÁMARA

// ============================================================

function hasFloorBelow(

    position

) {

    const physicsWorld =

        getPhysicsWorld();

    const RAPIER =

        getRapier();

    if (

        !physicsWorld ||

        !RAPIER

    ) {

        return true;

    }

    // --------------------------------------------------------

    // RAYO VERTICAL HACIA ABAJO

    // --------------------------------------------------------

    const ray =

        new RAPIER.Ray(

            {

                x: position.x,

                y: position.y + 0.1,

                z: position.z

            },

            {

                x: 0,

                y: -1,

                z: 0

            }

        );

    const hit =

        physicsWorld.castRay(

            ray,

            CAMERA_FLOOR_CHECK_DISTANCE,

            true,

            RAPIER.QueryFilterFlags.ONLY_FIXED

        );

    return Boolean(

        hit

    );

}

// ============================================================

// EVITAR QUE LA CÁMARA ATRAVIESE PAREDES

// ============================================================

// ============================================================

// EVITAR QUE LA CÁMARA SALGA DEL ESCENARIO

// ============================================================

function resolveCameraCollision(

    player

) {

    if (

        !player

    ) {

        return;

    }

    const physicsWorld =

        getPhysicsWorld();

    const RAPIER =

        getRapier();

    if (

        !physicsWorld ||

        !RAPIER

    ) {

        return;

    }

    // ========================================================

    // PUNTO CENTRAL DEL PERSONAJE

    // ========================================================

    const rayOrigin =

        controls.target;

    // ========================================================

    // DIRECCIÓN DESDE EL PERSONAJE HACIA LA CÁMARA

    // ========================================================

    cameraRayDirection

        .copy(

            camera.position

        )

        .sub(

            rayOrigin

        );

    const desiredDistance =

        cameraRayDirection.length();

    if (

        desiredDistance <= 0.001

    ) {

        return;

    }

    cameraRayDirection.normalize();

    // ========================================================

    // PRIMERA DEFENSA:

    // COMPROBAR PAREDES

    // ========================================================

    const wallRay =

        new RAPIER.Ray(

            {

                x: rayOrigin.x,

                y: rayOrigin.y,

                z: rayOrigin.z

            },

            {

                x: cameraRayDirection.x,

                y: cameraRayDirection.y,

                z: cameraRayDirection.z

            }

        );

    const wallHit =

        physicsWorld.castRay(

            wallRay,

            desiredDistance,

            true,

            RAPIER.QueryFilterFlags.ONLY_FIXED

        );

    // ========================================================

    // DISTANCIA PERMITIDA

    // ========================================================

    let safeDistance =

        desiredDistance;

    // ========================================================

    // SI HAY PARED, ACERCAR LA CÁMARA

    // ========================================================

    if (

        wallHit

    ) {

        safeDistance =

            Math.max(

                CAMERA_COLLISION_MIN_DISTANCE,

                wallHit.timeOfImpact -

                CAMERA_WALL_MARGIN

            );

    }

    // ========================================================

    // POSICIÓN INICIAL PROPUESTA

    // ========================================================

    cameraSafePosition

        .copy(

            rayOrigin

        )

        .addScaledVector(

            cameraRayDirection,

            safeDistance

        );

    // ========================================================

    // SEGUNDA DEFENSA:

    // COMPROBAR QUE EXISTA PISO

    // ========================================================

    if (

        !hasFloorBelow(

            cameraSafePosition

        )

    ) {

        let validPositionFound =

            false;

        // ----------------------------------------------------

        // ACERCARNOS AL PERSONAJE POCO A POCO

        // ----------------------------------------------------

        for (

            let distance = safeDistance;

            distance >= CAMERA_COLLISION_MIN_DISTANCE;

            distance -= CAMERA_SEARCH_STEP

        ) {

            cameraCandidatePosition

                .copy(

                    rayOrigin

                )

                .addScaledVector(

                    cameraRayDirection,

                    distance

                );

            if (

                hasFloorBelow(

                    cameraCandidatePosition

                )

            ) {

                cameraSafePosition.copy(

                    cameraCandidatePosition

                );

                validPositionFound =

                    true;

                break;

            }

        }

        // ----------------------------------------------------

        // SI NO ENCONTRAMOS NINGÚN PUNTO VÁLIDO

        // ----------------------------------------------------

        if (

            !validPositionFound

        ) {

            cameraSafePosition

                .copy(

                    rayOrigin

                )

                .addScaledVector(

                    cameraRayDirection,

                    CAMERA_COLLISION_MIN_DISTANCE

                );

        }

    }

    // ========================================================

    // COLOCAR CÁMARA

    // ========================================================

    camera.position.copy(

        cameraSafePosition

    );

}

// ============================================================

// LOOP DE ANIMACIÓN

// ============================================================

function animate() {

    requestAnimationFrame(

        animate

    );

    // --------------------------------------------------------

    // TIEMPO

    // --------------------------------------------------------

    timer.update();

    const deltaTime =

        timer.getDelta();

    // --------------------------------------------------------

    // FÍSICA

    // --------------------------------------------------------

    stepPhysics();

    // --------------------------------------------------------

    // PERSONAJE

    // --------------------------------------------------------

    const activePlayer =

        updatePlayer(

            deltaTime,

            camera

        );

    // --------------------------------------------------------

    // PROYECTILES

    // --------------------------------------------------------

    updateProjectiles(

        deltaTime,

        scene

    );


    // --------------------------------------------------------
    // NÚCLEOS DE ENERGÍA
    // --------------------------------------------------------

    updateCores(
        deltaTime,
        scene
    );

    // --------------------------------------------------------

    // SEGUIMIENTO DEL PERSONAJE

    // --------------------------------------------------------

    updateThirdPersonCamera(
        activePlayer
    );

    // --------------------------------------------------------

    // ORBIT CONTROLS

    // --------------------------------------------------------

    controls.update();

    // --------------------------------------------------------

    // COLISIÓN DE CÁMARA

    // --------------------------------------------------------

    //

    // IMPORTANTE:

    // Tiene que ejecutarse DESPUÉS de controls.update().

    //

    // OrbitControls primero intenta colocar la cámara donde

    // pidió el usuario.

    //

    // Después nosotros comprobamos si esa posición quedó

    // detrás de una pared.

    //

    // --------------------------------------------------------

    resolveCameraCollision(

        activePlayer

    );

    // --------------------------------------------------------

    // RENDER

    // --------------------------------------------------------

    renderer.render(

        scene,

        camera

    );

}

// ============================================================

// INICIAR APLICACIÓN

// ============================================================

async function startGame() {

    try {

        await initPhysics();

        loadEnvironment();

        animate();

    } catch (

    error

    ) {

        console.error(

            '❌ Error iniciando el videojuego:',

            error

        );

        gameStateElement.textContent =

            'ERROR';

    }

}

startGame();
