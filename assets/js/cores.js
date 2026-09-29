import * as THREE from 'three';

import {
    getPhysicsWorld,
    getRapier
} from './physics.js';

import {
    getProjectiles
} from './projectiles.js';


// ============================================================
// CONFIGURACIÓN DEL NÚCLEO
// ============================================================

// Tamaño físico/visual aproximado.
const CORE_RADIUS =
    0.38;


// Distancia a la que consideramos que
// un proyectil golpeó el núcleo.
//
// Debe ser un poco mayor que CORE_RADIUS
// porque el proyectil también tiene radio.
const CORE_HIT_DISTANCE =
    0.52;


// Distancia del núcleo de prueba frente al jugador.
const TEST_CORE_DISTANCE =
    2.8;


// Altura sobre la posición base del jugador.
const TEST_CORE_HEIGHT =
    0.95;


// ============================================================
// BÚSQUEDA DE POSICIÓN SEGURA
// ============================================================

// Distancias que probaremos desde el personaje.
const SAFE_SPAWN_DISTANCES =
    [
        2.8,
        2.4,
        2.0,
        1.6
    ];


// Ángulos relativos a la dirección frontal.
// Primero intentamos enfrente y después alrededor.
const SAFE_SPAWN_ANGLES =
    [
        0,
        Math.PI / 4,
        -Math.PI / 4,
        Math.PI / 2,
        -Math.PI / 2,
        Math.PI * 0.75,
        -Math.PI * 0.75
    ];


// Espacio mínimo alrededor del núcleo.
const CORE_WALL_CLEARANCE =
    CORE_RADIUS + 0.20;


// Altura desde donde comprobamos el piso.
const FLOOR_RAY_HEIGHT =
    1.5;


// Distancia máxima hacia abajo para encontrar piso.
const FLOOR_CHECK_DISTANCE =
    3.5;


// ============================================================
// ESTADO
// ============================================================

const cores =
    [];

let destroyedCoreCount =
    0;


// ============================================================
// VECTORES TEMPORALES
// ============================================================

const playerForward =
    new THREE.Vector3();

const corePosition =
    new THREE.Vector3();


const testDirection =
    new THREE.Vector3();

const rayDirection =
    new THREE.Vector3();

const playerRayOrigin =
    new THREE.Vector3();

const clearanceDirection =
    new THREE.Vector3();

const safeCandidate =
    new THREE.Vector3();


const worldUp =
    new THREE.Vector3(
        0,
        1,
        0
    );


// ============================================================
// CREAR VISUAL DEL NÚCLEO
// ============================================================

function createCoreVisual() {

    const group =
        new THREE.Group();


    group.name =
        'EnergyCore';


    // --------------------------------------------------------
    // ESFERA CENTRAL
    // --------------------------------------------------------

    const sphereGeometry =
        new THREE.SphereGeometry(
            CORE_RADIUS,
            24,
            24
        );


    const sphereMaterial =
        new THREE.MeshStandardMaterial({

            color:
                0x35ff9a,

            emissive:
                0x20ff80,

            emissiveIntensity:
                3.0,

            roughness:
                0.20,

            metalness:
                0.15

        });


    const sphere =
        new THREE.Mesh(
            sphereGeometry,
            sphereMaterial
        );


    sphere.castShadow =
        true;


    group.add(
        sphere
    );


    // --------------------------------------------------------
    // ANILLO 1
    // --------------------------------------------------------

    const ringGeometry1 =
        new THREE.TorusGeometry(
            CORE_RADIUS * 1.45,
            0.035,
            10,
            36
        );


    const ringMaterial1 =
        new THREE.MeshBasicMaterial({

            color:
                0x8dffd1,

            transparent:
                true,

            opacity:
                0.9

        });


    const ring1 =
        new THREE.Mesh(
            ringGeometry1,
            ringMaterial1
        );


    ring1.rotation.x =
        Math.PI / 2;


    group.add(
        ring1
    );


    // --------------------------------------------------------
    // ANILLO 2
    // --------------------------------------------------------

    const ringGeometry2 =
        new THREE.TorusGeometry(
            CORE_RADIUS * 1.25,
            0.025,
            10,
            32
        );


    const ringMaterial2 =
        new THREE.MeshBasicMaterial({

            color:
                0xc7ffe9,

            transparent:
                true,

            opacity:
                0.75

        });


    const ring2 =
        new THREE.Mesh(
            ringGeometry2,
            ringMaterial2
        );


    ring2.rotation.y =
        Math.PI / 2;


    group.add(
        ring2
    );


    // --------------------------------------------------------
    // LUZ
    // --------------------------------------------------------

    const light =
        new THREE.PointLight(
            0x40ff9d,
            3.5,
            5,
            2
        );


    group.add(
        light
    );


    group.userData.ring1 =
        ring1;

    group.userData.ring2 =
        ring2;


    return group;

}


// ============================================================
// CREAR NÚCLEO FÍSICO
// ============================================================

function createCorePhysics(
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

        console.warn(
            '⚠️ No se pudo crear la física del núcleo.'
        );


        return {
            rigidBody: null,
            collider: null
        };

    }


    const rigidBodyDescription =
        RAPIER.RigidBodyDesc
            .fixed()
            .setTranslation(
                position.x,
                position.y,
                position.z
            );


    const rigidBody =
        physicsWorld.createRigidBody(
            rigidBodyDescription
        );


    const colliderDescription =
        RAPIER.ColliderDesc
            .ball(
                CORE_RADIUS
            )
            .setRestitution(
                0.15
            )
            .setFriction(
                0.35
            );


    const collider =
        physicsWorld.createCollider(
            colliderDescription,
            rigidBody
        );


    return {
        rigidBody,
        collider
    };

}


// ============================================================
// COMPROBAR SI EXISTE PISO DEBAJO
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
                    position.y +
                    FLOOR_RAY_HEIGHT,

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

            FLOOR_CHECK_DISTANCE,

            true,

            RAPIER.QueryFilterFlags.ONLY_FIXED

        );


    return Boolean(
        hit
    );

}


// ============================================================
// COMPROBAR LÍNEA ENTRE JUGADOR Y NÚCLEO
// ============================================================
//
// Si existe una pared entre el personaje y la posición
// candidata, esa posición se descarta.
// ============================================================

function isPathClear(
    player,
    candidate
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


    playerRayOrigin
        .copy(
            player.position
        );


    // Aproximadamente altura del torso.
    playerRayOrigin.y +=
        TEST_CORE_HEIGHT;


    rayDirection
        .copy(
            candidate
        )
        .sub(
            playerRayOrigin
        );


    const distance =
        rayDirection.length();


    if (
        distance <= 0.001
    ) {

        return false;

    }


    rayDirection.normalize();


    const ray =
        new RAPIER.Ray(

            {
                x:
                    playerRayOrigin.x,

                y:
                    playerRayOrigin.y,

                z:
                    playerRayOrigin.z
            },

            {
                x:
                    rayDirection.x,

                y:
                    rayDirection.y,

                z:
                    rayDirection.z
            }

        );


    const hit =
        physicsWorld.castRay(

            ray,

            distance,

            true,

            RAPIER.QueryFilterFlags.ONLY_FIXED

        );


    // Si no toca ninguna pared/objeto fijo,
    // el trayecto está libre.
    return !hit;

}


// ============================================================
// COMPROBAR ESPACIO ALREDEDOR DEL NÚCLEO
// ============================================================
//
// Hacemos rayos cortos hacia cuatro direcciones.
// Así evitamos colocar el núcleo pegado o metido en una pared.
// ============================================================

function hasWallClearance(
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


    const directions =
        [
            [1, 0, 0],
            [-1, 0, 0],
            [0, 0, 1],
            [0, 0, -1]
        ];


    for (
        const direction of directions
    ) {

        clearanceDirection.set(
            direction[0],
            direction[1],
            direction[2]
        );


        const ray =
            new RAPIER.Ray(

                {
                    x:
                        position.x,

                    y:
                        position.y,

                    z:
                        position.z
                },

                {
                    x:
                        clearanceDirection.x,

                    y:
                        clearanceDirection.y,

                    z:
                        clearanceDirection.z
                }

            );


        const hit =
            physicsWorld.castRay(

                ray,

                CORE_WALL_CLEARANCE,

                true,

                RAPIER.QueryFilterFlags.ONLY_FIXED

            );


        if (
            hit
        ) {

            return false;

        }

    }


    return true;

}


// ============================================================
// BUSCAR POSICIÓN SEGURA
// ============================================================
//
// Orden de búsqueda:
//
// 1. enfrente,
// 2. diagonales,
// 3. costados,
// 4. diagonales traseras.
//
// Además probamos varias distancias.
//
// Una posición solo se acepta si:
//
// - hay piso debajo,
// - no hay una pared entre jugador y núcleo,
// - no está pegada a otra pared.
// ============================================================

function findSafeCorePosition(
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


    for (
        const distance of SAFE_SPAWN_DISTANCES
    ) {

        for (
            const angle of SAFE_SPAWN_ANGLES
        ) {

            testDirection
                .copy(
                    playerForward
                )
                .applyAxisAngle(
                    worldUp,
                    angle
                )
                .normalize();


            safeCandidate
                .copy(
                    player.position
                )
                .addScaledVector(
                    testDirection,
                    distance
                );


            safeCandidate.y =
                player.position.y +
                TEST_CORE_HEIGHT;


            if (
                !hasFloorBelow(
                    safeCandidate
                )
            ) {

                continue;

            }


            if (
                !isPathClear(
                    player,
                    safeCandidate
                )
            ) {

                continue;

            }


            if (
                !hasWallClearance(
                    safeCandidate
                )
            ) {

                continue;

            }


            return safeCandidate.clone();

        }

    }


    // Último respaldo:
    // si no encontramos un sitio perfecto,
    // usamos una posición muy cercana al jugador.
    const fallback =
        player.position
            .clone()
            .addScaledVector(
                playerForward,
                1.2
            );


    fallback.y +=
        TEST_CORE_HEIGHT;


    console.warn(
        '⚠️ No se encontró una posición completamente libre para el núcleo. Usando respaldo.'
    );


    return fallback;

}


// ============================================================
// CREAR NÚCLEO DE PRUEBA
// ============================================================
//
// Por ahora creamos SOLO UNO.
//
// Lo colocamos frente al jugador para comprobar:
//
// 1. que se vea,
// 2. que tenga collider,
// 3. que el proyectil lo detecte,
// 4. que desaparezca al recibir el impacto.
//
// Cuando esto funcione, lo convertimos en 5 núcleos.
// ============================================================

export function createTestCore(
    scene,
    player
) {

    if (
        !scene ||
        !player
    ) {

        return null;

    }


    // Evitar duplicarlo si la función se llama dos veces.
    if (
        cores.length > 0
    ) {

        return cores[0];

    }


    // ========================================================
    // POSICIÓN SEGURA DEL NÚCLEO
    // ========================================================

    const safePosition =
        findSafeCorePosition(
            player
        );


    corePosition.copy(
        safePosition
    );


    // ========================================================
    // VISUAL
    // ========================================================

    const group =
        createCoreVisual();


    group.position.copy(
        corePosition
    );


    scene.add(
        group
    );


    // ========================================================
    // FÍSICA
    // ========================================================

    const {
        rigidBody,
        collider
    } =
        createCorePhysics(
            corePosition
        );


    const core = {

        group,

        rigidBody,

        collider,

        active:
            true

    };


    cores.push(
        core
    );


    console.log(
        '🟢 Núcleo de prueba creado en:',
        corePosition
    );


    return core;

}


// ============================================================
// DESTRUIR NÚCLEO
// ============================================================

function destroyCore(
    core,
    scene
) {

    if (
        !core ||
        !core.active
    ) {

        return;

    }


    core.active =
        false;


    destroyedCoreCount +=
        1;


    // ========================================================
    // ELIMINAR FÍSICA
    // ========================================================

    const physicsWorld =
        getPhysicsWorld();


    if (
        physicsWorld &&
        core.rigidBody
    ) {

        physicsWorld.removeRigidBody(
            core.rigidBody
        );

    }


    // ========================================================
    // ELIMINAR VISUAL
    // ========================================================

    if (
        core.group
    ) {

        scene.remove(
            core.group
        );


        core.group.traverse(
            (object) => {

                if (
                    object.geometry
                ) {

                    object.geometry.dispose();

                }


                if (
                    object.material
                ) {

                    if (
                        Array.isArray(
                            object.material
                        )
                    ) {

                        object.material.forEach(
                            (material) => {

                                material.dispose();

                            }
                        );

                    } else {

                        object.material.dispose();

                    }

                }

            }
        );

    }


    console.log(
        `💥 Núcleo destruido: ${destroyedCoreCount}/${cores.length}`
    );

}


// ============================================================
// ACTUALIZAR NÚCLEOS
// ============================================================

export function updateCores(
    deltaTime,
    scene
) {

    if (
        !scene
    ) {

        return;

    }


    // ========================================================
    // ANIMACIÓN VISUAL
    // ========================================================

    for (
        const core of cores
    ) {

        if (
            !core.active ||
            !core.group
        ) {

            continue;

        }


        core.group.rotation.y +=
            0.9 *
            deltaTime;


        if (
            core.group.userData.ring1
        ) {

            core.group.userData.ring1.rotation.z +=
                1.4 *
                deltaTime;

        }


        if (
            core.group.userData.ring2
        ) {

            core.group.userData.ring2.rotation.x +=
                1.1 *
                deltaTime;

        }

    }


    // ========================================================
    // DETECTAR IMPACTOS DE PROYECTILES
    // ========================================================

    const projectiles =
        getProjectiles();


    for (
        const core of cores
    ) {

        if (
            !core.active
        ) {

            continue;

        }


        for (
            const projectile of projectiles
        ) {

            if (
                !projectile ||
                !projectile.mesh
            ) {

                continue;

            }


            const distanceSquared =
                projectile.mesh.position
                    .distanceToSquared(
                        core.group.position
                    );


            if (
                distanceSquared <=
                CORE_HIT_DISTANCE *
                CORE_HIT_DISTANCE
            ) {

                // Marcar proyectil para eliminarse
                // en el siguiente updateProjectiles().
                projectile.lifetime =
                    0;


                destroyCore(
                    core,
                    scene
                );


                break;

            }

        }

    }

}


// ============================================================
// OBTENER PROGRESO
// ============================================================

export function getDestroyedCoreCount() {

    return destroyedCoreCount;

}


export function getTotalCoreCount() {

    return cores.length;

}
