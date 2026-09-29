import * as THREE from 'three';

import {
    getPhysicsWorld,
    getRapier
} from './physics.js';


// ============================================================
// CONFIGURACIÓN
// ============================================================

const PROJECTILE_RADIUS =
    0.12;

const PROJECTILE_SPEED =
    13;

const PROJECTILE_LIFETIME =
    5;


// ============================================================
// PROYECTILES ACTIVOS
// ============================================================

const projectiles = [];


// ============================================================
// VECTORES TEMPORALES
// ============================================================

const shootDirection =
    new THREE.Vector3();

const spawnPosition =
    new THREE.Vector3();


// ============================================================
// CREAR PROYECTIL
// ============================================================

export function createProjectile(
    scene,
    player,
    camera
) {

    if (
        !scene ||
        !player ||
        !camera
    ) {

        return null;

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
            '⚠️ Rapier todavía no está disponible.'
        );

        return null;

    }


    // ========================================================
    // DIRECCIÓN DEL DISPARO
    // ========================================================
    //
    // La dirección depende de la cámara.
    // Esto hace que el proyectil viaje hacia el centro
    // de la pantalla / crosshair.
    //
    // ========================================================

    camera.getWorldDirection(
        shootDirection
    );

    shootDirection.normalize();


    // ========================================================
    // POSICIÓN DE APARICIÓN
    // ========================================================
    //
    // Sale aproximadamente desde el pecho/mano del personaje
    // y un poco hacia delante.
    //
    // ========================================================

    spawnPosition
        .copy(
            player.position
        );


    spawnPosition.y +=
        1.15;


    spawnPosition.addScaledVector(
        shootDirection,
        0.9
    );


    // ========================================================
    // MALLA VISUAL
    // ========================================================

    const geometry =
        new THREE.SphereGeometry(
            PROJECTILE_RADIUS,
            16,
            16
        );


    const material =
        new THREE.MeshStandardMaterial({

            color:
                0x40ff9d,

            emissive:
                0x20ff80,

            emissiveIntensity:
                2,

            roughness:
                0.3,

            metalness:
                0.1

        });


    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );


    mesh.position.copy(
        spawnPosition
    );


    mesh.castShadow =
        true;


    scene.add(
        mesh
    );


    // ========================================================
    // CUERPO FÍSICO
    // ========================================================

    const rigidBodyDescription =
        RAPIER.RigidBodyDesc
            .dynamic()
            .setTranslation(
                spawnPosition.x,
                spawnPosition.y,
                spawnPosition.z
            );


    const rigidBody =
        physicsWorld.createRigidBody(
            rigidBodyDescription
        );


    // ========================================================
    // COLLIDER
    // ========================================================

    const colliderDescription =
        RAPIER.ColliderDesc
            .ball(
                PROJECTILE_RADIUS
            )
            .setRestitution(
                0.15
            )
            .setFriction(
                0.2
            );


    const collider =
        physicsWorld.createCollider(
            colliderDescription,
            rigidBody
        );


    // ========================================================
    // VELOCIDAD
    // ========================================================

    rigidBody.setLinvel(
        {

            x:
                shootDirection.x *
                PROJECTILE_SPEED,

            y:
                shootDirection.y *
                PROJECTILE_SPEED,

            z:
                shootDirection.z *
                PROJECTILE_SPEED

        },

        true
    );


    // ========================================================
    // REGISTRAR PROYECTIL
    // ========================================================

    const projectile = {

        mesh,

        rigidBody,

        collider,

        lifetime:
            PROJECTILE_LIFETIME

    };


    projectiles.push(
        projectile
    );


    console.log(
        '🟢 Proyectil creado'
    );


    return projectile;

}


// ============================================================
// ACTUALIZAR PROYECTILES
// ============================================================

export function updateProjectiles(
    deltaTime,
    scene
) {

    const physicsWorld =
        getPhysicsWorld();


    if (
        !physicsWorld
    ) {

        return;

    }


    // Recorremos desde el último hacia el primero
    // porque algunos pueden ser eliminados.

    for (
        let i = projectiles.length - 1;
        i >= 0;
        i--
    ) {

        const projectile =
            projectiles[i];


        // ====================================================
        // SINCRONIZAR THREE.JS CON RAPIER
        // ====================================================

        const position =
            projectile.rigidBody.translation();


        projectile.mesh.position.set(
            position.x,
            position.y,
            position.z
        );


        const rotation =
            projectile.rigidBody.rotation();


        projectile.mesh.quaternion.set(
            rotation.x,
            rotation.y,
            rotation.z,
            rotation.w
        );


        // ====================================================
        // TIEMPO DE VIDA
        // ====================================================

        projectile.lifetime -=
            deltaTime;


        // ====================================================
        // ELIMINAR SI CADUCÓ
        // ====================================================

        if (
            projectile.lifetime <= 0
        ) {

            removeProjectile(
                projectile,
                scene,
                physicsWorld
            );


            projectiles.splice(
                i,
                1
            );

        }

    }

}


// ============================================================
// ELIMINAR PROYECTIL
// ============================================================

function removeProjectile(
    projectile,
    scene,
    physicsWorld
) {

    if (
        projectile.mesh
    ) {

        scene.remove(
            projectile.mesh
        );


        projectile.mesh.geometry.dispose();


        if (
            projectile.mesh.material
        ) {

            projectile.mesh.material.dispose();

        }

    }


    if (
        projectile.rigidBody
    ) {

        physicsWorld.removeRigidBody(
            projectile.rigidBody
        );

    }

}


// ============================================================
// OBTENER PROYECTILES ACTIVOS
// ============================================================

export function getProjectiles() {

    return projectiles;

}