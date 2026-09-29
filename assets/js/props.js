import * as THREE from 'three';

import {
    getPhysicsWorld,
    getRapier
} from './physics.js';


// ============================================================
// OBJETOS FÍSICOS DINÁMICOS
// OPERACIÓN: REACTOR
// ============================================================
//
// Esta versión prioriza que los objetos sean fáciles de localizar.
//
// Se crean:
// 1. Cajas
// 2. Esferas
// 3. Cilindros
// 4. Conos
//
// Además:
// - una estructura derribable de 9 cajas;
// - una luz verde;
//
// La zona se coloca cerca del jugador.
// ============================================================


const dynamicProps =
    [];


let propsCreated =
    false;


let locatorGroup =
    null;


// ============================================================
// CONFIGURACIÓN
// ============================================================

const BOX_HALF_SIZE =
    0.30;


const BOX_SPACING =
    0.64;


const STRUCTURE_COLUMNS =
    3;


const STRUCTURE_ROWS =
    3;


const FLOOR_RAY_DISTANCE =
    7.0;


// ------------------------------------------------------------
// POSICIONES CANDIDATAS CERCA DEL JUGADOR
// ------------------------------------------------------------

const SITE_OFFSETS =
    [

        { x: 0.0, z: -3.2 },

        { x: 3.2, z: 0.0 },

        { x: -3.2, z: 0.0 },

        { x: 0.0, z: 3.2 },

        { x: 2.4, z: -2.4 },

        { x: -2.4, z: -2.4 },

        { x: 2.4, z: 2.4 },

        { x: -2.4, z: 2.4 }

    ];


// ============================================================
// MATERIALES
// ============================================================

const boxMaterial =
    new THREE.MeshStandardMaterial({
        color: 0xaab3b8,
        roughness: 0.64,
        metalness: 0.22
    });


const sphereMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x5d8394,
        roughness: 0.50,
        metalness: 0.26
    });


const cylinderMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x9b7957,
        roughness: 0.58,
        metalness: 0.18
    });


const coneMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x8b975c,
        roughness: 0.60,
        metalness: 0.14
    });


// ============================================================
// HELPERS
// ============================================================

function enableShadows(
    mesh
) {

    mesh.castShadow =
        true;


    mesh.receiveShadow =
        true;

}


// ============================================================
// BUSCAR PISO
// ============================================================

function findFloorAt(
    physicsWorld,
    RAPIER,
    x,
    z,
    referenceY
) {

    const originY =
        referenceY + 3.0;


    const ray =
        new RAPIER.Ray(
            {
                x,
                y: originY,
                z
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
            FLOOR_RAY_DISTANCE,
            true,
            RAPIER.QueryFilterFlags.ONLY_FIXED
        );


    if (
        !hit
    ) {

        return null;

    }


    return originY -
        hit.timeOfImpact;

}


// ============================================================
// ELEGIR ZONA
// ============================================================

function findBuildSite(
    player
) {

    const physicsWorld =
        getPhysicsWorld();


    const RAPIER =
        getRapier();


    if (
        !physicsWorld ||
        !RAPIER ||
        !player
    ) {

        return null;

    }


    // --------------------------------------------------------
    // Intentar varios puntos alrededor del jugador.
    // --------------------------------------------------------

    for (
        const offset of SITE_OFFSETS
    ) {

        const x =
            player.position.x +
            offset.x;


        const z =
            player.position.z +
            offset.z;


        const floorY =
            findFloorAt(
                physicsWorld,
                RAPIER,
                x,
                z,
                player.position.y
            );


        if (
            floorY ===
                null
        ) {

            continue;

        }


        // Queremos el mismo nivel donde está el jugador.
        if (
            Math.abs(
                floorY -
                player.position.y
            ) >
            1.5
        ) {

            continue;

        }


        return new THREE.Vector3(
            x,
            floorY,
            z
        );

    }


    // --------------------------------------------------------
    // RESPALDO:
    // si los raycasts no encuentran una zona, utilizamos
    // la altura del propio jugador, que sabemos que está
    // actualmente parado sobre una superficie válida.
    // --------------------------------------------------------

    console.warn(
        '⚠️ No se detectó piso cercano con raycast. Usando zona de respaldo.'
    );


    return new THREE.Vector3(
        player.position.x +
            3.0,
        player.position.y,
        player.position.z
    );

}


// ============================================================
// MARCADOR VISUAL PARA LOCALIZAR LA ZONA
// ============================================================

function createLocator(
    scene,
    site
) {

    locatorGroup =
        new THREE.Group();


    locatorGroup.position.copy(
        site
    );


    // --------------------------------------------------------
    // Baliza vertical
    // --------------------------------------------------------

    const beam =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.025,
                0.025,
                3.5,
                8
            ),
            new THREE.MeshBasicMaterial({
                color: 0x40ff9d,
                transparent: true,
                opacity: 0.36
            })
        );


    beam.position.y =
        1.75;


    locatorGroup.add(
        beam
    );


    // --------------------------------------------------------
    // Luz
    // --------------------------------------------------------

    const light =
        new THREE.PointLight(
            0x40ff9d,
            5.5,
            8,
            2
        );


    light.position.set(
        0,
        2.2,
        0
    );


    locatorGroup.add(
        light
    );


    scene.add(
        locatorGroup
    );

}


// ============================================================
// REGISTRAR OBJETO
// ============================================================

function registerDynamicObject(
    mesh,
    rigidBody,
    collider,
    type
) {

    dynamicProps.push({
        mesh,
        rigidBody,
        collider,
        type
    });

}


// ============================================================
// CAJA
// ============================================================

function createBox(
    scene,
    physicsWorld,
    RAPIER,
    position,
    size = 0.60
) {

    const half =
        size / 2;


    const mesh =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                size,
                size,
                size
            ),
            boxMaterial
        );


    mesh.position.copy(
        position
    );


    enableShadows(
        mesh
    );


    scene.add(
        mesh
    );


    const body =
        physicsWorld.createRigidBody(
            RAPIER.RigidBodyDesc
                .dynamic()
                .setTranslation(
                    position.x,
                    position.y,
                    position.z
                )
                .setLinearDamping(
                    0.08
                )
                .setAngularDamping(
                    0.08
                )
        );


    const collider =
        physicsWorld.createCollider(
            RAPIER.ColliderDesc
                .cuboid(
                    half,
                    half,
                    half
                )
                .setDensity(
                    0.10
                )
                .setFriction(
                    0.72
                )
                .setRestitution(
                    0.08
                ),
            body
        );


    registerDynamicObject(
        mesh,
        body,
        collider,
        'box'
    );

}


// ============================================================
// ESFERA
// ============================================================

function createSphere(
    scene,
    physicsWorld,
    RAPIER,
    position
) {

    const radius =
        0.36;


    const mesh =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                radius,
                22,
                16
            ),
            sphereMaterial
        );


    mesh.position.copy(
        position
    );


    enableShadows(
        mesh
    );


    scene.add(
        mesh
    );


    const body =
        physicsWorld.createRigidBody(
            RAPIER.RigidBodyDesc
                .dynamic()
                .setTranslation(
                    position.x,
                    position.y,
                    position.z
                )
        );


    const collider =
        physicsWorld.createCollider(
            RAPIER.ColliderDesc
                .ball(
                    radius
                )
                .setDensity(
                    0.18
                )
                .setFriction(
                    0.48
                )
                .setRestitution(
                    0.36
                ),
            body
        );


    registerDynamicObject(
        mesh,
        body,
        collider,
        'sphere'
    );

}


// ============================================================
// CILINDRO
// ============================================================

function createCylinder(
    scene,
    physicsWorld,
    RAPIER,
    position
) {

    const radius =
        0.31;


    const height =
        0.82;


    const halfHeight =
        height / 2;


    const mesh =
        new THREE.Mesh(
            new THREE.CylinderGeometry(
                radius,
                radius,
                height,
                20
            ),
            cylinderMaterial
        );


    mesh.position.copy(
        position
    );


    enableShadows(
        mesh
    );


    scene.add(
        mesh
    );


    const body =
        physicsWorld.createRigidBody(
            RAPIER.RigidBodyDesc
                .dynamic()
                .setTranslation(
                    position.x,
                    position.y,
                    position.z
                )
        );


    const collider =
        physicsWorld.createCollider(
            RAPIER.ColliderDesc
                .cylinder(
                    halfHeight,
                    radius
                )
                .setDensity(
                    0.14
                )
                .setFriction(
                    0.66
                )
                .setRestitution(
                    0.13
                ),
            body
        );


    registerDynamicObject(
        mesh,
        body,
        collider,
        'cylinder'
    );

}


// ============================================================
// CONO
// ============================================================

function createCone(
    scene,
    physicsWorld,
    RAPIER,
    position
) {

    const radius =
        0.35;


    const height =
        0.82;


    const halfHeight =
        height / 2;


    const mesh =
        new THREE.Mesh(
            new THREE.ConeGeometry(
                radius,
                height,
                20
            ),
            coneMaterial
        );


    mesh.position.copy(
        position
    );


    enableShadows(
        mesh
    );


    scene.add(
        mesh
    );


    const body =
        physicsWorld.createRigidBody(
            RAPIER.RigidBodyDesc
                .dynamic()
                .setTranslation(
                    position.x,
                    position.y,
                    position.z
                )
        );


    const collider =
        physicsWorld.createCollider(
            RAPIER.ColliderDesc
                .cone(
                    halfHeight,
                    radius
                )
                .setDensity(
                    0.12
                )
                .setFriction(
                    0.62
                )
                .setRestitution(
                    0.10
                ),
            body
        );


    registerDynamicObject(
        mesh,
        body,
        collider,
        'cone'
    );

}


// ============================================================
// ESTRUCTURA DERRIBABLE
// ============================================================

function createKnockdownStructure(
    scene,
    physicsWorld,
    RAPIER,
    site
) {

    for (
        let row = 0;
        row < STRUCTURE_ROWS;
        row += 1
    ) {

        for (
            let column = 0;
            column < STRUCTURE_COLUMNS;
            column += 1
        ) {

            const x =
                site.x +
                (
                    column -
                    1
                ) *
                BOX_SPACING;


            const y =
                site.y +
                BOX_HALF_SIZE +
                row *
                BOX_SPACING;


            const z =
                site.z;


            createBox(
                scene,
                physicsWorld,
                RAPIER,
                new THREE.Vector3(
                    x,
                    y,
                    z
                )
            );

        }

    }

}


// ============================================================
// CREAR ZONA FÍSICA
// ============================================================

export function createDynamicProps(
    scene,
    player
) {

    if (
        propsCreated ||
        !scene ||
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

        console.warn(
            '⚠️ Rapier todavía no está listo para crear objetos físicos.'
        );


        return;

    }


    const site =
        findBuildSite(
            player
        );


    if (
        !site
    ) {

        return;

    }


    propsCreated =
        true;


    createLocator(
        scene,
        site
    );


    createKnockdownStructure(
        scene,
        physicsWorld,
        RAPIER,
        site
    );


    createSphere(
        scene,
        physicsWorld,
        RAPIER,
        new THREE.Vector3(
            site.x + 1.45,
            site.y + 0.38,
            site.z + 1.10
        )
    );


    createCylinder(
        scene,
        physicsWorld,
        RAPIER,
        new THREE.Vector3(
            site.x - 1.45,
            site.y + 0.43,
            site.z + 1.10
        )
    );


    createCone(
        scene,
        physicsWorld,
        RAPIER,
        new THREE.Vector3(
            site.x,
            site.y + 0.43,
            site.z + 1.45
        )
    );


    console.log(
        '=============================================='
    );


    console.log(
        '📦 OBJETOS FÍSICOS VISIBLES CREADOS'
    );


    console.log(
        '📍 POSICIÓN:',
        {
            x: Number(
                site.x.toFixed(
                    2
                )
            ),
            y: Number(
                site.y.toFixed(
                    2
                )
            ),
            z: Number(
                site.z.toFixed(
                    2
                )
            )
        }
    );


    console.log(
        'Busca la baliza y la luz verde.'
    );


    console.log(
        '=============================================='
    );

}


// ============================================================
// ACTUALIZAR MALLAS
// ============================================================

export function updateDynamicProps() {

    for (
        const prop of dynamicProps
    ) {

        if (
            !prop.rigidBody ||
            !prop.mesh
        ) {

            continue;

        }


        const position =
            prop.rigidBody.translation();


        const rotation =
            prop.rigidBody.rotation();


        prop.mesh.position.set(
            position.x,
            position.y,
            position.z
        );


        prop.mesh.quaternion.set(
            rotation.x,
            rotation.y,
            rotation.z,
            rotation.w
        );

    }

}


// ============================================================
// GETTERS
// ============================================================

export function getDynamicProps() {

    return dynamicProps;

}


export function getDynamicPropCount() {

    return dynamicProps.length;

}
