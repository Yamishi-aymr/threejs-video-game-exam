import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import {

    loadPlayer,

    updatePlayer,

    getPlayer,

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

    prepareDoorsForExploration,

    restoreDoorsAfterCollider,

    setupDoorInteractions,

    updateDoorInteractions

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


import {

    setupStairs,

    updateStairs,

    isStairTransitionActive

} from './stairs.js';


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

// OrbitControls permanece disponible.
//
// El usuario puede inspeccionar el escenario con el mouse.
// Cuando deja de mover la cámara y comienza a caminar,
// la cámara vuelve SUAVEMENTE detrás del personaje.
controls.enableDamping = true;
controls.dampingFactor = 0.05;

controls.enablePan = false;
controls.enableZoom = true;
controls.enableRotate = true;

controls.minDistance = 1.25;
controls.maxDistance = 4.8;

controls.minPolarAngle = 0.35;
controls.maxPolarAngle =
    Math.PI / 2.05;

controls.target.set(
    0,
    2,
    0
);


// ============================================================
// INTERACCIÓN MANUAL DE CÁMARA
// ============================================================
//
// Mientras el usuario está moviendo OrbitControls,
// el seguimiento automático NO intenta recentrar.
//
// Cuando suelta el mouse:
// - en Idle conservamos el ángulo elegido;
// - al moverse, después de una pequeña pausa,
//   la cámara empieza a volver detrás del personaje.
// ============================================================

let isCameraOrbiting =
    false;


let timeSinceManualCamera =
    Infinity;


controls.addEventListener(
    'start',
    () => {

        isCameraOrbiting =
            true;

    }
);


controls.addEventListener(
    'end',
    () => {

        isCameraOrbiting =
            false;

        timeSinceManualCamera =
            0;

    }
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
            // VOLVER A MOSTRAR PUERTAS
            // =================================================
            //
            // prepareDoorsForExploration() las retira
            // temporalmente antes de crear el collider.
            //
            // Así las puertas se ven en el juego, pero NO
            // forman parte del collider estático del escenario.
            //
            // Cuando el jugador pulse E, la puerta se elimina
            // visualmente y el paso queda libre.
            // =================================================

            restoreDoorsAfterCollider();


            environment.updateMatrixWorld(
                true
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
                        // ESCALERAS INTERACTIVAS
                        // -------------------------------------

                        setupStairs({

                            player,

                            camera,

                            controls,

                            onTransitionComplete:
                                () => {

                                    snapCameraBehindPlayer(
                                        player
                                    );

                                }

                        });


                        // -------------------------------------
                        // PUERTAS INTERACTIVAS
                        // -------------------------------------
                        //
                        // Al acercarse aparece:
                        // [E] Abrir puerta
                        //
                        // Al presionar E la puerta desaparece
                        // y NO vuelve a colocarse.
                        // -------------------------------------

                        setupDoorInteractions(
                            player
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
// CÁMARA EN TERCERA PERSONA - SEGUIMIENTO CON PESO
// ============================================================
//
// Comportamiento:
//
// - inicia detrás del personaje;
// - sigue su posición;
// - sigue su giro con retraso suave;
// - tiene un pequeño offset de hombro;
// - OrbitControls sigue funcionando;
// - mientras el usuario mueve el mouse no se recentra;
// - si está Idle, conserva el ángulo elegido;
// - cuando vuelve a caminar, retorna poco a poco a la espalda.
//
// La intención es evitar una cámara "soldada" al personaje
// y conseguir una sensación de cámara con peso.
// ============================================================


// ============================================================
// CONFIGURACIÓN PRINCIPAL
// ============================================================

// Distancia detrás del personaje.
const CAMERA_DISTANCE =
    3.8;


// Altura de la cámara.
const CAMERA_HEIGHT =
    1.75;


// Altura del punto que observa.
const CAMERA_TARGET_HEIGHT =
    1.30;


// Cuánto mira por delante del personaje.
const CAMERA_LOOK_AHEAD =
    1.00;


// Desplazamiento lateral tipo cámara sobre el hombro.
//
// Positivo = hombro derecho.
// Negativo = hombro izquierdo.
const CAMERA_SHOULDER_OFFSET =
    0.50;


// ============================================================
// SUAVIZADO
// ============================================================

// Qué tan rápido sigue la posición.
//
// Este valor puede ser relativamente alto porque no produce
// el mismo mareo que copiar instantáneamente la rotación.
const CAMERA_POSITION_SPEED =
    3.8;


// Qué tan rápido sigue el GIRO del personaje.
//
// Este es intencionalmente más bajo para que
// la cámara tenga "peso".
const CAMERA_ROTATION_SPEED =
    1.65;


// Qué tan rápido se mueve el punto al que mira.
const CAMERA_TARGET_SPEED =
    4.2;


// Tiempo después de soltar OrbitControls antes de
// permitir que la cámara se recentre al caminar.
const CAMERA_RECENTER_DELAY =
    0.30;


// Distancia mínima recorrida en un frame para considerar
// que el personaje está realmente moviéndose.
const CAMERA_MOVEMENT_EPSILON =
    0.0000005;


// ============================================================
// ESTADO DEL SEGUIMIENTO
// ============================================================

let cameraTrackingInitialized =
    false;


// Yaw suavizado utilizado para seguir la orientación.
let cameraFollowYaw =
    0;


// ============================================================
// VECTORES REUTILIZABLES
// ============================================================

const playerForward =
    new THREE.Vector3();


const smoothForward =
    new THREE.Vector3();


const smoothBackward =
    new THREE.Vector3();


const smoothRight =
    new THREE.Vector3();


const desiredCameraPosition =
    new THREE.Vector3();


const desiredCameraTarget =
    new THREE.Vector3();


const previousPlayerPosition =
    new THREE.Vector3();


const playerFrameMovement =
    new THREE.Vector3();


// ============================================================
// FUNCIONES AUXILIARES
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
// CONVERTIR DIRECCIÓN A YAW
// ============================================================

function getYawFromForward(
    forward
) {

    return Math.atan2(
        forward.x,
        forward.z
    );

}


// ============================================================
// INTERPOLAR ÁNGULO POR EL CAMINO MÁS CORTO
// ============================================================

function lerpAngle(
    current,
    target,
    alpha
) {

    const difference =
        Math.atan2(
            Math.sin(
                target -
                current
            ),
            Math.cos(
                target -
                current
            )
        );


    return current +
        difference *
        alpha;

}


// ============================================================
// GENERAR VECTORES DESDE EL YAW SUAVIZADO
// ============================================================

function updateSmoothedDirections() {

    smoothForward.set(
        Math.sin(
            cameraFollowYaw
        ),
        0,
        Math.cos(
            cameraFollowYaw
        )
    );


    smoothForward.normalize();


    smoothBackward
        .copy(
            smoothForward
        )
        .multiplyScalar(
            -1
        );


    // Derecha respecto a la dirección frontal.
    smoothRight.set(
        smoothForward.z,
        0,
        -smoothForward.x
    );


    smoothRight.normalize();

}


// ============================================================
// COLOCAR CÁMARA INICIAL
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


    cameraFollowYaw =
        getYawFromForward(
            forward
        );


    updateSmoothedDirections();


    // ========================================================
    // POSICIÓN
    // ========================================================

    desiredCameraPosition
        .copy(
            player.position
        )
        .addScaledVector(
            smoothBackward,
            CAMERA_DISTANCE
        )
        .addScaledVector(
            smoothRight,
            CAMERA_SHOULDER_OFFSET
        );


    desiredCameraPosition.y +=
        CAMERA_HEIGHT;


    // ========================================================
    // TARGET
    // ========================================================

    desiredCameraTarget
        .copy(
            player.position
        );


    desiredCameraTarget.y +=
        CAMERA_TARGET_HEIGHT;


    desiredCameraTarget.addScaledVector(
        smoothForward,
        CAMERA_LOOK_AHEAD
    );


    camera.position.copy(
        desiredCameraPosition
    );


    controls.target.copy(
        desiredCameraTarget
    );


    previousPlayerPosition.copy(
        player.position
    );


    cameraTrackingInitialized =
        true;


    controls.update();

}


// ============================================================
// ACTUALIZAR CÁMARA
// ============================================================

function updateThirdPersonCamera(
    player,
    deltaTime
) {

    if (
        !player
    ) {

        return;

    }


    const safeDeltaTime =
        Math.max(
            deltaTime,
            0
        );


    // ========================================================
    // INICIALIZACIÓN
    // ========================================================

    if (
        !cameraTrackingInitialized
    ) {

        snapCameraBehindPlayer(
            player
        );


        return;

    }


    // ========================================================
    // TIEMPO DESDE EL ÚLTIMO MOVIMIENTO MANUAL
    // ========================================================

    if (
        !isCameraOrbiting &&
        Number.isFinite(
            timeSinceManualCamera
        )
    ) {

        timeSinceManualCamera +=
            safeDeltaTime;

    }


    // ========================================================
    // MOVIMIENTO DEL PERSONAJE
    // ========================================================

    playerFrameMovement
        .copy(
            player.position
        )
        .sub(
            previousPlayerPosition
        );


    const isPlayerMoving =
        playerFrameMovement.lengthSq() >
        CAMERA_MOVEMENT_EPSILON;


    // ========================================================
    // MIENTRAS EL USUARIO MUEVE LA CÁMARA
    // ========================================================
    //
    // No recentramos.
    //
    // Si además el personaje se mueve, trasladamos cámara
    // y target junto con él para que no se quede atrás.
    // ========================================================

    if (
        isCameraOrbiting
    ) {

        if (
            isPlayerMoving
        ) {

            camera.position.add(
                playerFrameMovement
            );


            controls.target.add(
                playerFrameMovement
            );

        }


        // Seguimos actualizando internamente el yaw deseado
        // para que cuando el usuario suelte el mouse la
        // transición parta hacia la orientación actual.
        const playerYaw =
            getYawFromForward(
                getPlayerForward(
                    player
                )
            );


        const rotationAlpha =
            1 -
            Math.exp(
                -CAMERA_ROTATION_SPEED *
                safeDeltaTime
            );


        cameraFollowYaw =
            lerpAngle(
                cameraFollowYaw,
                playerYaw,
                rotationAlpha
            );


        previousPlayerPosition.copy(
            player.position
        );


        return;

    }


    // ========================================================
    // IDLE
    // ========================================================
    //
    // Si el personaje está quieto NO forzamos recentrado.
    //
    // Esto permite inspeccionar tranquilamente la habitación
    // con OrbitControls.
    // ========================================================

    if (
        !isPlayerMoving
    ) {

        previousPlayerPosition.copy(
            player.position
        );


        return;

    }


    // ========================================================
    // DESPUÉS DE USAR EL MOUSE
    // ========================================================
    //
    // Durante un pequeño intervalo seguimos respetando
    // el ángulo manual aunque el personaje esté caminando.
    // ========================================================

    if (
        timeSinceManualCamera <
        CAMERA_RECENTER_DELAY
    ) {

        camera.position.add(
            playerFrameMovement
        );


        controls.target.add(
            playerFrameMovement
        );


        previousPlayerPosition.copy(
            player.position
        );


        return;

    }


    // ========================================================
    // SEGUIMIENTO CON PESO
    // ========================================================

    const forward =
        getPlayerForward(
            player
        );


    const playerYaw =
        getYawFromForward(
            forward
        );


    // --------------------------------------------------------
    // ROTACIÓN LENTA
    // --------------------------------------------------------

    const rotationAlpha =
        1 -
        Math.exp(
            -CAMERA_ROTATION_SPEED *
            safeDeltaTime
        );


    cameraFollowYaw =
        lerpAngle(
            cameraFollowYaw,
            playerYaw,
            rotationAlpha
        );


    updateSmoothedDirections();


    // ========================================================
    // POSICIÓN DESEADA
    // ========================================================

    desiredCameraPosition
        .copy(
            player.position
        )
        .addScaledVector(
            smoothBackward,
            CAMERA_DISTANCE
        )
        .addScaledVector(
            smoothRight,
            CAMERA_SHOULDER_OFFSET
        );


    desiredCameraPosition.y +=
        CAMERA_HEIGHT;


    // ========================================================
    // TARGET DESEADO
    // ========================================================

    desiredCameraTarget
        .copy(
            player.position
        );


    desiredCameraTarget.y +=
        CAMERA_TARGET_HEIGHT;


    desiredCameraTarget.addScaledVector(
        smoothForward,
        CAMERA_LOOK_AHEAD
    );


    // ========================================================
    // SUAVIZADO DE POSICIÓN
    // ========================================================

    const positionAlpha =
        1 -
        Math.exp(
            -CAMERA_POSITION_SPEED *
            safeDeltaTime
        );


    camera.position.lerp(
        desiredCameraPosition,
        positionAlpha
    );


    // ========================================================
    // SUAVIZADO DEL TARGET
    // ========================================================

    const targetAlpha =
        1 -
        Math.exp(
            -CAMERA_TARGET_SPEED *
            safeDeltaTime
        );


    controls.target.lerp(
        desiredCameraTarget,
        targetAlpha
    );


    previousPlayerPosition.copy(
        player.position
    );

}

// ============================================================
// COLISIÓN DE CÁMARA - VOLUMEN APROXIMADO
// ============================================================
//
// Antes se utilizaba un único rayo desde el target hasta
// la cámara. Eso podía dejar pasar una esquina de pared
// muy cerca del lente.
//
// Ahora usamos cinco rayos:
//
//              ↑
//          ←   •   →
//              ↓
//
// El punto central es la trayectoria principal y los otros
// cuatro simulan aproximadamente el volumen de la cámara.
//
// Resultado:
// - menos paredes ocupando toda la pantalla;
// - menos clipping en esquinas;
// - la cámara conserva un margen respecto a los muros;
// - cuando entra a un espacio estrecho se acerca al personaje;
// - cuando vuelve a haber espacio recupera su distancia
//   gracias al seguimiento suave principal.
// ============================================================


// Radio aproximado de la cámara.
const CAMERA_COLLISION_RADIUS =
    0.30;


// Margen extra antes de tocar una pared.
const CAMERA_WALL_MARGIN =
    0.20;


// Nunca acercar más que esto al punto objetivo.
const CAMERA_COLLISION_MIN_DISTANCE =
    1.20;


// Distancia hacia abajo utilizada para comprobar
// que la cámara no termine flotando fuera del escenario.
const CAMERA_FLOOR_CHECK_DISTANCE =
    5.5;


// Paso para buscar una posición con piso si fuera necesario.
const CAMERA_SEARCH_STEP =
    0.15;


// ============================================================
// VECTORES REUTILIZABLES
// ============================================================

const cameraRayDirection =
    new THREE.Vector3();


const cameraCollisionRight =
    new THREE.Vector3();


const cameraCollisionUp =
    new THREE.Vector3();


const cameraCollisionOffset =
    new THREE.Vector3();


const cameraRayOriginOffset =
    new THREE.Vector3();


const cameraSafePosition =
    new THREE.Vector3();


const cameraCandidatePosition =
    new THREE.Vector3();


const cameraWorldUp =
    new THREE.Vector3(
        0,
        1,
        0
    );


// ============================================================
// COMPROBAR PISO
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


    const ray =
        new RAPIER.Ray(

            {

                x:
                    position.x,

                y:
                    position.y + 0.10,

                z:
                    position.z

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
// LANZAR UN RAYO DE COLISIÓN
// ============================================================

function getCameraRaySafeDistance(
    rayOrigin,
    direction,
    desiredDistance,
    offset
) {

    const physicsWorld =
        getPhysicsWorld();


    const RAPIER =
        getRapier();


    if (
        !physicsWorld ||
        !RAPIER
    ) {

        return desiredDistance;

    }


    cameraRayOriginOffset
        .copy(
            rayOrigin
        )
        .add(
            offset
        );


    const ray =
        new RAPIER.Ray(

            {

                x:
                    cameraRayOriginOffset.x,

                y:
                    cameraRayOriginOffset.y,

                z:
                    cameraRayOriginOffset.z

            },

            {

                x:
                    direction.x,

                y:
                    direction.y,

                z:
                    direction.z

            }

        );


    const hit =
        physicsWorld.castRay(

            ray,

            desiredDistance,

            true,

            RAPIER.QueryFilterFlags.ONLY_FIXED

        );


    if (
        !hit
    ) {

        return desiredDistance;

    }


    return Math.max(

        CAMERA_COLLISION_MIN_DISTANCE,

        hit.timeOfImpact -
        CAMERA_WALL_MARGIN

    );

}


// ============================================================
// RESOLVER COLISIÓN
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
    // ORIGEN
    // ========================================================
    //
    // Usamos el target actual de OrbitControls porque
    // representa el punto que la cámara está observando.
    // ========================================================

    const rayOrigin =
        controls.target;


    // ========================================================
    // DIRECCIÓN HACIA LA CÁMARA
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
        desiredDistance <=
        0.001
    ) {

        return;

    }


    cameraRayDirection.normalize();


    // ========================================================
    // EJES DEL "VOLUMEN" DE CÁMARA
    // ========================================================

    cameraCollisionRight
        .crossVectors(
            cameraWorldUp,
            cameraRayDirection
        );


    // Si la cámara está casi totalmente vertical,
    // usamos un eje alternativo.
    if (
        cameraCollisionRight.lengthSq() <
        0.000001
    ) {

        cameraCollisionRight.set(
            1,
            0,
            0
        );

    } else {

        cameraCollisionRight.normalize();

    }


    cameraCollisionUp
        .crossVectors(
            cameraRayDirection,
            cameraCollisionRight
        )
        .normalize();


    // ========================================================
    // CINCO RAYOS
    // ========================================================

    let safeDistance =
        desiredDistance;


    // Centro.
    cameraCollisionOffset.set(
        0,
        0,
        0
    );


    safeDistance =
        Math.min(

            safeDistance,

            getCameraRaySafeDistance(
                rayOrigin,
                cameraRayDirection,
                desiredDistance,
                cameraCollisionOffset
            )

        );


    // Derecha.
    cameraCollisionOffset
        .copy(
            cameraCollisionRight
        )
        .multiplyScalar(
            CAMERA_COLLISION_RADIUS
        );


    safeDistance =
        Math.min(

            safeDistance,

            getCameraRaySafeDistance(
                rayOrigin,
                cameraRayDirection,
                desiredDistance,
                cameraCollisionOffset
            )

        );


    // Izquierda.
    cameraCollisionOffset
        .copy(
            cameraCollisionRight
        )
        .multiplyScalar(
            -CAMERA_COLLISION_RADIUS
        );


    safeDistance =
        Math.min(

            safeDistance,

            getCameraRaySafeDistance(
                rayOrigin,
                cameraRayDirection,
                desiredDistance,
                cameraCollisionOffset
            )

        );


    // Arriba.
    cameraCollisionOffset
        .copy(
            cameraCollisionUp
        )
        .multiplyScalar(
            CAMERA_COLLISION_RADIUS
        );


    safeDistance =
        Math.min(

            safeDistance,

            getCameraRaySafeDistance(
                rayOrigin,
                cameraRayDirection,
                desiredDistance,
                cameraCollisionOffset
            )

        );


    // Abajo.
    cameraCollisionOffset
        .copy(
            cameraCollisionUp
        )
        .multiplyScalar(
            -CAMERA_COLLISION_RADIUS
        );


    safeDistance =
        Math.min(

            safeDistance,

            getCameraRaySafeDistance(
                rayOrigin,
                cameraRayDirection,
                desiredDistance,
                cameraCollisionOffset
            )

        );


    // ========================================================
    // POSICIÓN SEGURA
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
    // EVITAR SALIR DEL MAPA
    // ========================================================

    if (
        !hasFloorBelow(
            cameraSafePosition
        )
    ) {

        let validPositionFound =
            false;


        for (

            let distance =
                safeDistance;

            distance >=
                CAMERA_COLLISION_MIN_DISTANCE;

            distance -=
                CAMERA_SEARCH_STEP

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
    // APLICAR SOLO CUANDO ES NECESARIO
    // ========================================================
    //
    // Si no hubo obstáculo, dejamos que el seguimiento
    // principal controle el movimiento suave.
    //
    // Si hay obstáculo, corregimos inmediatamente para que
    // la pared nunca atraviese la cámara.
    // ========================================================

    const correctedDistance =
        cameraSafePosition
            .distanceTo(
                rayOrigin
            );


    if (
        correctedDistance <
        desiredDistance -
        0.001
    ) {

        camera.position.copy(
            cameraSafePosition
        );

    }

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

    let activePlayer;


    if (
        isStairTransitionActive()
    ) {

        // Durante la transición de escaleras
        // bloqueamos WASD temporalmente.
        activePlayer =
            getPlayer();

    } else {

        activePlayer =
            updatePlayer(

                deltaTime,

                camera

            );

    }


    // --------------------------------------------------------
    // ESCALERAS / INTERACCIÓN
    // --------------------------------------------------------

    updateStairs(
        activePlayer
    );


    // --------------------------------------------------------
    // PUERTAS / INTERACCIÓN
    // --------------------------------------------------------

    updateDoorInteractions(
        activePlayer
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
        activePlayer,
        deltaTime
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
