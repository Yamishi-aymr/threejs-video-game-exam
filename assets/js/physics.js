import * as THREE from 'three';

import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.20.0/+esm';


// ============================================================
// VARIABLES GENERALES
// ============================================================

let physicsWorld = null;

let physicsReady = false;


// ============================================================
// ESCENARIO FÍSICO
// ============================================================

let environmentCollider = null;


// ============================================================
// PERSONAJE FÍSICO
// ============================================================

let playerRigidBody = null;

let playerCollider = null;

let characterController = null;


// ============================================================
// CONFIGURACIÓN DEL PERSONAJE
// ============================================================

// Personaje aproximado: 1.74 m

const PLAYER_RADIUS = 0.32;

const PLAYER_HALF_HEIGHT = 0.55;

const PLAYER_CENTER_OFFSET =
    PLAYER_HALF_HEIGHT +
    PLAYER_RADIUS;


// ============================================================
// GRAVEDAD DEL PERSONAJE
// ============================================================

const GRAVITY = -9.81;

let verticalVelocity = 0;


// ============================================================
// GRAVEDAD DEL MUNDO
// ============================================================

const WORLD_GRAVITY = {
    x: 0,
    y: -9.81,
    z: 0
};


// ============================================================
// INICIALIZAR RAPIER
// ============================================================

export async function initPhysics() {

    if (
        physicsReady
    ) {

        return physicsWorld;

    }


    console.log(
        '⚙️ Inicializando Rapier 3D...'
    );


    await RAPIER.init();


    console.log(
        '🧩 WASM de Rapier cargado'
    );


    physicsWorld =
        new RAPIER.World(
            WORLD_GRAVITY
        );


    physicsReady = true;


    console.log(
        '✅ Rapier 3D inicializado'
    );


    console.log(
        '🌎 Mundo físico creado'
    );


    console.log(
        '⬇️ Gravedad:',
        WORLD_GRAVITY
    );


    return physicsWorld;

}


// ============================================================
// CREAR COLLIDER DEL ESCENARIO
// ============================================================

export function createEnvironmentCollider(
    environment
) {

    if (
        !physicsWorld ||
        !environment
    ) {

        console.warn(
            '⚠️ No se pudo crear collider del escenario'
        );

        return null;

    }


    console.log(
        '🏢 Generando collider físico del laboratorio...'
    );


    // Necesitamos las matrices finales
    // después de mover y centrar el escenario.

    environment.updateMatrixWorld(
        true
    );


    const vertices = [];

    const indices = [];

    const vertex =
        new THREE.Vector3();


    let vertexOffset = 0;

    let includedMeshes = 0;


    environment.traverse(
        (object) => {

            if (
                !object.isMesh ||
                !object.visible
            ) {

                return;

            }


            const geometry =
                object.geometry;


            if (
                !geometry ||
                !geometry.attributes ||
                !geometry.attributes.position
            ) {

                return;

            }


            const positionAttribute =
                geometry.attributes.position;


            // ================================================
            // VÉRTICES
            // ================================================

            for (
                let i = 0;
                i < positionAttribute.count;
                i++
            ) {

                vertex
                    .fromBufferAttribute(
                        positionAttribute,
                        i
                    )
                    .applyMatrix4(
                        object.matrixWorld
                    );


                vertices.push(
                    vertex.x,
                    vertex.y,
                    vertex.z
                );

            }


            // ================================================
            // ÍNDICES
            // ================================================

            if (
                geometry.index
            ) {

                const indexAttribute =
                    geometry.index;


                for (
                    let i = 0;
                    i < indexAttribute.count;
                    i++
                ) {

                    indices.push(
                        vertexOffset +
                        indexAttribute.getX(
                            i
                        )
                    );

                }

            } else {

                for (
                    let i = 0;
                    i < positionAttribute.count;
                    i++
                ) {

                    indices.push(
                        vertexOffset + i
                    );

                }

            }


            vertexOffset +=
                positionAttribute.count;


            includedMeshes++;

        }
    );


    // ========================================================
    // CONVERTIR A BUFFERS PARA RAPIER
    // ========================================================

    const verticesArray =
        new Float32Array(
            vertices
        );


    const indicesArray =
        new Uint32Array(
            indices
        );


    // ========================================================
    // CREAR TRIMESH
    // ========================================================

    const colliderDesc =
        RAPIER.ColliderDesc.trimesh(
            verticesArray,
            indicesArray
        );


    colliderDesc.setFriction(
        0.8
    );


    environmentCollider =
        physicsWorld.createCollider(
            colliderDesc
        );


    console.log(
        '✅ Collider del escenario creado'
    );


    console.log(
        '🧱 Mallas físicas:',
        includedMeshes
    );


    console.log(
        '🔺 Triángulos aproximados:',
        Math.floor(
            indicesArray.length / 3
        )
    );


    return environmentCollider;

}


// ============================================================
// CREAR CUERPO FÍSICO DEL PERSONAJE
// ============================================================

export function createPlayerPhysics(
    spawnPosition
) {

    if (
        !physicsWorld
    ) {

        console.error(
            '❌ Rapier todavía no está inicializado'
        );

        return null;

    }


    // ========================================================
    // RIGID BODY CINEMÁTICO
    // ========================================================

    const rigidBodyDesc =
        RAPIER.RigidBodyDesc
            .kinematicPositionBased()
            .setTranslation(
                spawnPosition.x,
                spawnPosition.y +
                    PLAYER_CENTER_OFFSET,
                spawnPosition.z
            );


    playerRigidBody =
        physicsWorld.createRigidBody(
            rigidBodyDesc
        );


    // ========================================================
    // CAPSULE COLLIDER
    // ========================================================

    const colliderDesc =
        RAPIER.ColliderDesc.capsule(
            PLAYER_HALF_HEIGHT,
            PLAYER_RADIUS
        );


    colliderDesc.setFriction(
        0.0
    );


    playerCollider =
        physicsWorld.createCollider(
            colliderDesc,
            playerRigidBody
        );


    // ========================================================
    // CHARACTER CONTROLLER
    // ========================================================

    characterController =
        physicsWorld.createCharacterController(
            0.02
        );


    // Subir escalones pequeños

    characterController.enableAutostep(
        0.35,
        0.15,
        false
    );


    // Mantenerse pegado al piso

    characterController.enableSnapToGround(
        0.3
    );


    // Pendientes

    characterController.setMaxSlopeClimbAngle(
        45 * Math.PI / 180
    );


    characterController.setMinSlopeSlideAngle(
        30 * Math.PI / 180
    );


    // Más adelante permitirá empujar
    // objetos dinámicos.

    characterController
        .setApplyImpulsesToDynamicBodies(
            true
        );


    verticalVelocity = 0;


    console.log(
        '✅ Física del personaje creada'
    );


    console.log(
        '🟢 RigidBody cinemático creado'
    );


    console.log(
        '🟣 Capsule Collider creado'
    );


    console.log(
        '🎮 Character Controller creado'
    );


    return {
        rigidBody: playerRigidBody,
        collider: playerCollider,
        controller: characterController
    };

}


// ============================================================
// MOVER PERSONAJE CON RAPIER
// ============================================================

export function movePlayerWithPhysics(
    horizontalMovement,
    deltaTime
) {

    if (
        !playerRigidBody ||
        !playerCollider ||
        !characterController
    ) {

        return null;

    }


    // ========================================================
    // GRAVEDAD
    // ========================================================

    verticalVelocity +=
        GRAVITY * deltaTime;


    const desiredMovement = {
        x: horizontalMovement.x,
        y: verticalVelocity * deltaTime,
        z: horizontalMovement.z
    };


    // ========================================================
    // CALCULAR MOVIMIENTO VÁLIDO
    // ========================================================

    characterController
        .computeColliderMovement(
            playerCollider,
            desiredMovement
        );


    const correctedMovement =
        characterController
            .computedMovement();


    // ========================================================
    // DETECTAR SUELO
    // ========================================================

    const grounded =
        characterController
            .computedGrounded();


    if (
        grounded &&
        verticalVelocity < 0
    ) {

        verticalVelocity = 0;

    }


    // ========================================================
    // POSICIÓN ACTUAL
    // ========================================================

    const currentPosition =
        playerRigidBody.translation();


    const nextPosition = {
        x:
            currentPosition.x +
            correctedMovement.x,

        y:
            currentPosition.y +
            correctedMovement.y,

        z:
            currentPosition.z +
            correctedMovement.z
    };


    // ========================================================
    // APLICAR POSICIÓN
    // ========================================================

    playerRigidBody
        .setNextKinematicTranslation(
            nextPosition
        );


    // ========================================================
    // DEVOLVER POSICIÓN DE LOS PIES
    // PARA EL MODELO THREE.JS
    // ========================================================

    return {
        x: nextPosition.x,

        y:
            nextPosition.y -
            PLAYER_CENTER_OFFSET,

        z: nextPosition.z,

        grounded
    };

}


// ============================================================
// ACTUALIZAR FÍSICA
// ============================================================

export function stepPhysics() {

    if (
        !physicsWorld
    ) {

        return;

    }


    physicsWorld.step();

}


// ============================================================
// OBTENER MUNDO
// ============================================================

export function getPhysicsWorld() {

    return physicsWorld;

}


// ============================================================
// OBTENER RAPIER
// ============================================================

export function getRapier() {

    return RAPIER;

}


// ============================================================
// ESTADO
// ============================================================

export function isPhysicsReady() {

    return physicsReady;

}