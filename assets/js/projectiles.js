import * as THREE from 'three';



import {

    getPhysicsWorld,

    getRapier

} from './physics.js';


import {

    getDynamicProps

} from './props.js';





// ============================================================

// CONFIGURACIÓN DEL PROYECTIL

// ============================================================



// Tamaño de la pelota.

const PROJECTILE_RADIUS =

    0.07;





// Tiempo de vida del proyectil.

const PROJECTILE_LIFETIME =

    5;





// Separación al salir de las manos.

//

// Evita que el collider aparezca

// exactamente dentro del personaje.

const PROJECTILE_RELEASE_OFFSET =

    0.22;





// ============================================================

// FÍSICA

// ============================================================



// Gravedad del proyectil.

//

// 1 = gravedad normal.

// 2 = el doble de gravedad.

const PROJECTILE_GRAVITY_SCALE =

    2;





// Densidad utilizada por Rapier

// para calcular la masa.

const PROJECTILE_DENSITY =

    24;





// Gravedad base del mundo.

const WORLD_GRAVITY =

    9.81;





// ============================================================

// SISTEMA DE APUNTADO

// ============================================================



// Distancia máxima que puede buscar

// la mira dentro del escenario.

const AIM_MAX_DISTANCE =

    25;





// Tiempo que intentará tardar la pelota

// en llegar al punto de la mira.

//

// Menor:

// lanzamiento rápido/directo.

//

// Mayor:

// lanzamiento más lento y arqueado.

const PROJECTILE_FLIGHT_TIME =

    0.85;





// ============================================================

// PROYECTILES

// ============================================================



const projectiles =

    [];





let heldProjectile =

    null;





// ============================================================

// VECTORES TEMPORALES

// ============================================================



const rightHandPosition =

    new THREE.Vector3();



const leftHandPosition =

    new THREE.Vector3();



const fingerPosition =

    new THREE.Vector3();



const heldPosition =

    new THREE.Vector3();





// Apuntado

const cameraWorldPosition =

    new THREE.Vector3();



const aimDirection =

    new THREE.Vector3();



const aimTarget =

    new THREE.Vector3();





// Lanzamiento

const launchDirection =

    new THREE.Vector3();



const launchVelocity =

    new THREE.Vector3();




// ============================================================
// IMPACTO POTENCIADO CONTRA OBJETOS DINÁMICOS
// ============================================================
//
// Rapier sigue resolviendo la colisión normal.
// Este apoyo añade un impulso físico controlado a los objetos
// creados en props.js.
//
// La fuerza depende de la velocidad REAL del proyectil,
// por lo que el slider de potencia sí cambia el resultado.
// ============================================================

const PROJECTILE_IMPACT_RADIUS =
    0.62;


const PROJECTILE_IMPACT_FACTOR =
    0.020;


const PROJECTILE_MIN_IMPULSE =
    0.22;


const PROJECTILE_MAX_IMPULSE =
    1.30;


function applyImpactToDynamicProps(
    projectile
) {

    if (
        !projectile ||
        !projectile.rigidBody
    ) {

        return;

    }


    const props =
        getDynamicProps();


    if (
        !props ||
        props.length === 0
    ) {

        return;

    }


    if (
        !projectile.impactedBodies
    ) {

        projectile.impactedBodies =
            new Set();

    }


    const projectilePosition =
        projectile.rigidBody.translation();


    const velocity =
        projectile.rigidBody.linvel();


    const speed =
        Math.sqrt(
            velocity.x * velocity.x +
            velocity.y * velocity.y +
            velocity.z * velocity.z
        );


    if (
        speed < 0.2
    ) {

        return;

    }


    const inverseSpeed =
        1 /
        Math.max(
            speed,
            0.001
        );


    const direction = {

        x:
            velocity.x *
            inverseSpeed,

        y:
            velocity.y *
            inverseSpeed,

        z:
            velocity.z *
            inverseSpeed

    };


    const impulseStrength =
        THREE.MathUtils.clamp(
            speed *
            PROJECTILE_IMPACT_FACTOR,
            PROJECTILE_MIN_IMPULSE,
            PROJECTILE_MAX_IMPULSE
        );


    const hitDistanceSquared =
        PROJECTILE_IMPACT_RADIUS *
        PROJECTILE_IMPACT_RADIUS;


    for (
        const prop of props
    ) {

        if (
            !prop ||
            !prop.rigidBody ||
            projectile.impactedBodies.has(
                prop.rigidBody
            )
        ) {

            continue;

        }


        const targetPosition =
            prop.rigidBody.translation();


        const dx =
            targetPosition.x -
            projectilePosition.x;


        const dy =
            targetPosition.y -
            projectilePosition.y;


        const dz =
            targetPosition.z -
            projectilePosition.z;


        const distanceSquared =
            dx * dx +
            dy * dy +
            dz * dz;


        if (
            distanceSquared >
            hitDistanceSquared
        ) {

            continue;

        }


        projectile.impactedBodies.add(
            prop.rigidBody
        );


        prop.rigidBody.applyImpulse(
            {

                x:
                    direction.x *
                    impulseStrength,

                y:
                    Math.max(
                        0.10,
                        direction.y *
                        impulseStrength +
                        impulseStrength *
                        0.22
                    ),

                z:
                    direction.z *
                    impulseStrength

            },
            true
        );


        prop.rigidBody.applyTorqueImpulse(
            {

                x:
                    -direction.z *
                    impulseStrength *
                    0.34,

                y:
                    impulseStrength *
                    0.12,

                z:
                    direction.x *
                    impulseStrength *
                    0.34

            },
            true
        );


        console.log(
            '💥 Impacto físico:',
            prop.type,
            'fuerza:',
            impulseStrength.toFixed(
                2
            )
        );

    }

}






// ============================================================

// UTILIDADES DEL RIG

// ============================================================



function normalizeRigName(

    name = ''

) {



    return name

        .toLowerCase()

        .replace(

            /[^a-z0-9]/g,

            ''

        );



}





function isFingerName(

    name

) {



    return (

        name.includes('thumb') ||

        name.includes('index') ||

        name.includes('middle') ||

        name.includes('ring') ||

        name.includes('pinky') ||

        name.includes('little')

    );



}





// ============================================================

// BUSCAR MANO DERECHA

// ============================================================



function findRightHand(

    player

) {



    let result =

        null;





    const exactNames =

        new Set([



            'mixamorigrighthand',

            'righthand',

            'handright',

            'handr',

            'rhand',

            'rightwrist',

            'rwrist',

            'bip01rhand'



        ]);





    // ========================================================

    // NOMBRE EXACTO

    // ========================================================



    player.traverse(

        (object) => {



            if (

                result

            ) {



                return;



            }





            const name =

                normalizeRigName(

                    object.name

                );





            if (

                exactNames.has(

                    name

                )

            ) {



                result =

                    object;



            }



        }

    );





    if (

        result

    ) {



        console.log(

            '✅ Mano derecha encontrada:',

            result.name

        );





        return result;



    }





    // ========================================================

    // BÚSQUEDA FLEXIBLE

    // ========================================================



    player.traverse(

        (object) => {



            if (

                result

            ) {



                return;



            }





            const name =

                normalizeRigName(

                    object.name

                );





            if (

                (

                    name.includes(

                        'righthand'

                    ) ||

                    name.includes(

                        'rightwrist'

                    )

                ) &&

                !isFingerName(

                    name

                )

            ) {



                result =

                    object;



            }



        }

    );





    if (

        result

    ) {



        console.log(

            '✅ Mano derecha encontrada automáticamente:',

            result.name

        );





        return result;



    }





    // ========================================================

    // RESPALDO:

    // ANTEBRAZO DERECHO

    // ========================================================



    player.traverse(

        (object) => {



            if (

                result

            ) {



                return;



            }





            const name =

                normalizeRigName(

                    object.name

                );





            if (

                name.includes(

                    'rightforearm'

                ) ||

                name.includes(

                    'rightlowerarm'

                )

            ) {



                result =

                    object;



            }



        }

    );





    if (

        result

    ) {



        console.warn(

            '⚠️ Usando antebrazo derecho como respaldo:',

            result.name

        );



    }





    return result;



}





// ============================================================

// BUSCAR MANO IZQUIERDA

// ============================================================



function findLeftHand(

    player

) {



    let result =

        null;





    const exactNames =

        new Set([



            'mixamoriglefthand',

            'lefthand',

            'handleft',

            'handl',

            'lhand',

            'leftwrist',

            'lwrist',

            'bip01lhand'



        ]);





    // ========================================================

    // NOMBRE EXACTO

    // ========================================================



    player.traverse(

        (object) => {



            if (

                result

            ) {



                return;



            }





            const name =

                normalizeRigName(

                    object.name

                );





            if (

                exactNames.has(

                    name

                )

            ) {



                result =

                    object;



            }



        }

    );





    if (

        result

    ) {



        console.log(

            '✅ Mano izquierda encontrada:',

            result.name

        );





        return result;



    }





    // ========================================================

    // BÚSQUEDA FLEXIBLE

    // ========================================================



    player.traverse(

        (object) => {



            if (

                result

            ) {



                return;



            }





            const name =

                normalizeRigName(

                    object.name

                );





            if (

                (

                    name.includes(

                        'lefthand'

                    ) ||

                    name.includes(

                        'leftwrist'

                    )

                ) &&

                !isFingerName(

                    name

                )

            ) {



                result =

                    object;



            }



        }

    );





    if (

        result

    ) {



        console.log(

            '✅ Mano izquierda encontrada automáticamente:',

            result.name

        );





        return result;



    }





    // ========================================================

    // RESPALDO:

    // ANTEBRAZO IZQUIERDO

    // ========================================================



    player.traverse(

        (object) => {



            if (

                result

            ) {



                return;



            }





            const name =

                normalizeRigName(

                    object.name

                );





            if (

                name.includes(

                    'leftforearm'

                ) ||

                name.includes(

                    'leftlowerarm'

                )

            ) {



                result =

                    object;



            }



        }

    );





    if (

        result

    ) {



        console.warn(

            '⚠️ Usando antebrazo izquierdo como respaldo:',

            result.name

        );



    }





    return result;



}





// ============================================================

// BUSCAR DEDO MEDIO DERECHO

// ============================================================



function findRightMiddleFinger(

    player

) {



    let result =

        null;





    player.traverse(

        (object) => {



            if (

                result

            ) {



                return;



            }





            const name =

                normalizeRigName(

                    object.name

                );





            if (

                name.includes(

                    'righthandmiddle1'

                ) ||

                name.includes(

                    'rightmiddle1'

                ) ||

                name.includes(

                    'middlefinger1r'

                )

            ) {



                result =

                    object;



            }



        }

    );





    return result;



}





// ============================================================

// CREAR PELOTA VISUAL

// ============================================================



function createProjectileMesh() {



    const geometry =

        new THREE.SphereGeometry(

            PROJECTILE_RADIUS,

            18,

            18

        );





    const material =

        new THREE.MeshStandardMaterial({



            color:

                0x40ff9d,



            emissive:

                0x20ff80,



            emissiveIntensity:

                2.5,



            roughness:

                0.25,



            metalness:

                0.1



        });





    const mesh =

        new THREE.Mesh(

            geometry,

            material

        );





    mesh.castShadow =

        true;





    return mesh;



}





// ============================================================

// CREAR PELOTA ENTRE LAS MANOS

// ============================================================



export function createHeldProjectile(

    scene,

    player

) {



    if (

        !scene ||

        !player

    ) {



        return null;



    }





    // No crear otra mientras

    // exista una sostenida.

    if (

        heldProjectile

    ) {



        return heldProjectile;



    }





    // ========================================================

    // BUSCAR MANOS

    // ========================================================



    const rightHand =

        findRightHand(

            player

        );





    const leftHand =

        findLeftHand(

            player

        );





    const rightMiddleFinger =

        findRightMiddleFinger(

            player

        );





    // ========================================================

    // CREAR PELOTA

    // ========================================================



    const mesh =

        createProjectileMesh();





    scene.add(

        mesh

    );





    heldProjectile = {



        mesh,



        player,



        rightHand,



        leftHand,



        rightMiddleFinger



    };





    // Colocarla inmediatamente.

    updateHeldProjectile();





    if (

        rightHand &&

        leftHand

    ) {



        console.log(

            '🟢 Proyectil colocado entre ambas manos'

        );



    } else if (

        rightHand

    ) {



        console.log(

            '🟢 Proyectil colocado en la mano derecha'

        );



    } else if (

        leftHand

    ) {



        console.log(

            '🟢 Proyectil colocado en la mano izquierda'

        );



    } else {



        console.warn(

            '🟡 No se encontraron las manos. Usando posición de respaldo.'

        );



    }





    return heldProjectile;



}





// ============================================================

// ACTUALIZAR PELOTA EN LAS MANOS

// ============================================================



function updateHeldProjectile() {



    if (

        !heldProjectile

    ) {



        return;



    }





    const {



        mesh,



        player,



        rightHand,



        leftHand,



        rightMiddleFinger



    } =

        heldProjectile;





    // ========================================================

    // DOS MANOS

    // ========================================================



    if (

        rightHand &&

        leftHand

    ) {



        rightHand.getWorldPosition(

            rightHandPosition

        );





        leftHand.getWorldPosition(

            leftHandPosition

        );





        // Punto medio entre ambas manos.

        heldPosition

            .copy(

                rightHandPosition

            )

            .add(

                leftHandPosition

            )

            .multiplyScalar(

                0.5

            );





        // Pequeño ajuste visual.

        heldPosition.y +=

            0.025;





        mesh.position.copy(

            heldPosition

        );





        return;



    }





    // ========================================================

    // SOLO MANO DERECHA

    // ========================================================



    if (

        rightHand

    ) {



        rightHand.getWorldPosition(

            rightHandPosition

        );





        if (

            rightMiddleFinger

        ) {



            rightMiddleFinger.getWorldPosition(

                fingerPosition

            );





            heldPosition

                .copy(

                    rightHandPosition

                )

                .lerp(

                    fingerPosition,

                    0.55

                );



        } else {



            heldPosition.copy(

                rightHandPosition

            );



        }





        mesh.position.copy(

            heldPosition

        );





        return;



    }





    // ========================================================

    // SOLO MANO IZQUIERDA

    // ========================================================



    if (

        leftHand

    ) {



        leftHand.getWorldPosition(

            leftHandPosition

        );





        mesh.position.copy(

            leftHandPosition

        );





        return;



    }





    // ========================================================

    // RESPALDO

    // ========================================================



    if (

        player

    ) {



        heldPosition

            .set(

                0,

                1.15,

                0.30

            )

            .applyQuaternion(

                player.quaternion

            )

            .add(

                player.position

            );





        mesh.position.copy(

            heldPosition

        );



    }



}





// ============================================================

// OBTENER OBJETIVO DE LA MIRA

// ============================================================

//

// La mira está en el centro de la pantalla.

//

// Como la cámara también apunta exactamente desde

// el centro de la pantalla, usamos:

// camera.getWorldDirection()

//

// Después Rapier busca qué parte del escenario

// está debajo de esa mira.

// ============================================================



function getCrosshairTarget(

    camera

) {



    const physicsWorld =

        getPhysicsWorld();





    const RAPIER =

        getRapier();





    // ========================================================

    // POSICIÓN DE LA CÁMARA

    // ========================================================



    camera.getWorldPosition(

        cameraWorldPosition

    );





    // ========================================================

    // DIRECCIÓN EXACTA DE LA MIRA

    // ========================================================



    camera.getWorldDirection(

        aimDirection

    );





    aimDirection.normalize();





    // ========================================================

    // SI RAPIER AÚN NO ESTÁ DISPONIBLE

    // ========================================================



    if (

        !physicsWorld ||

        !RAPIER

    ) {



        aimTarget

            .copy(

                cameraWorldPosition

            )

            .addScaledVector(

                aimDirection,

                AIM_MAX_DISTANCE

            );





        return aimTarget;



    }





    // ========================================================

    // CREAR RAYO DESDE LA CÁMARA

    // ========================================================



    const ray =

        new RAPIER.Ray(



            {



                x:

                    cameraWorldPosition.x,



                y:

                    cameraWorldPosition.y,



                z:

                    cameraWorldPosition.z



            },



            {



                x:

                    aimDirection.x,



                y:

                    aimDirection.y,



                z:

                    aimDirection.z



            }



        );





    // ========================================================

    // BUSCAR PARED / PISO / ESCENARIO

    // ========================================================

    //

    // ONLY_FIXED:

    //

    // Solo detectamos colliders estáticos.

    //

    // Así evitamos que el propio personaje

    // intercepte la mira.

    // ========================================================



    const hit =

        physicsWorld.castRay(



            ray,



            AIM_MAX_DISTANCE,



            true,



            RAPIER.QueryFilterFlags.ONLY_FIXED



        );





    // ========================================================

    // SI LA MIRA TOCA EL ESCENARIO

    // ========================================================



    if (

        hit

    ) {



        aimTarget

            .copy(

                cameraWorldPosition

            )

            .addScaledVector(

                aimDirection,

                hit.timeOfImpact

            );





        return aimTarget;



    }





    // ========================================================

    // SI NO TOCA NADA

    // ========================================================



    aimTarget

        .copy(

            cameraWorldPosition

        )

        .addScaledVector(

            aimDirection,

            AIM_MAX_DISTANCE

        );





    return aimTarget;



}





// ============================================================

// CALCULAR VELOCIDAD BALÍSTICA

// ============================================================

//

// Queremos:

//

//                  ✚

//               objetivo

//                  |

//             🟢

//          ↗

//       🟢

//    ↗

// 🤾

//

// La fórmula calcula qué velocidad inicial

// necesita la pelota para alcanzar el objetivo

// después de PROJECTILE_FLIGHT_TIME segundos.

// ============================================================



function calculateLaunchVelocity(

    startPosition,

    targetPosition

) {



    const time =

        PROJECTILE_FLIGHT_TIME;





    // ========================================================

    // DESPLAZAMIENTO

    // ========================================================



    const deltaX =

        targetPosition.x -

        startPosition.x;





    const deltaY =

        targetPosition.y -

        startPosition.y;





    const deltaZ =

        targetPosition.z -

        startPosition.z;





    // ========================================================

    // GRAVEDAD REAL QUE AFECTA A LA PELOTA

    // ========================================================



    const gravity =

        WORLD_GRAVITY *

        PROJECTILE_GRAVITY_SCALE;





    // ========================================================

    // VELOCIDAD HORIZONTAL

    // ========================================================



    launchVelocity.x =

        deltaX /

        time;





    launchVelocity.z =

        deltaZ /

        time;





    // ========================================================

    // VELOCIDAD VERTICAL

    // ========================================================

    //

    // y = y0 + vy*t - 1/2gt²

    //

    // despejamos vy.

    // ========================================================



    launchVelocity.y =

        (

            deltaY +

            (

                0.5 *

                gravity *

                time *

                time

            )

        ) /

        time;





    return launchVelocity;



}





// ============================================================

// SOLTAR PROYECTIL

// ============================================================



export function releaseHeldProjectile(

    scene,

    camera

) {



    if (

        !heldProjectile ||

        !scene ||

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





    const mesh =

        heldProjectile.mesh;





    // ========================================================

    // POSICIÓN EXACTA DE LAS MANOS

    // ========================================================



    updateHeldProjectile();





    // ========================================================

    // ENCONTRAR PUNTO DE LA MIRA

    // ========================================================



    const targetPosition =

        getCrosshairTarget(

            camera

        );





    // ========================================================

    // POSICIÓN DE SALIDA

    // ========================================================



    const spawnPosition =

        mesh.position.clone();





    // ========================================================

    // DIRECCIÓN DESDE LAS MANOS HACIA LA MIRA

    // ========================================================



    launchDirection

        .copy(

            targetPosition

        )

        .sub(

            spawnPosition

        );





    if (

        launchDirection.lengthSq() >

        0.000001

    ) {



        launchDirection.normalize();



    } else {



        camera.getWorldDirection(

            launchDirection

        );





        launchDirection.normalize();



    }





    // ========================================================

    // ALEJAR UN POCO DEL PERSONAJE

    // ========================================================



    spawnPosition.addScaledVector(

        launchDirection,

        PROJECTILE_RELEASE_OFFSET

    );





    mesh.position.copy(

        spawnPosition

    );





    // ========================================================

    // VELOCIDAD PARA LLEGAR A LA MIRA

    // ========================================================



    const velocity =

        calculateLaunchVelocity(

            spawnPosition,

            targetPosition

        );





    // ========================================================

    // CREAR RIGID BODY

    // ========================================================



    const rigidBodyDescription =

        RAPIER.RigidBodyDesc

            .dynamic()



            .setTranslation(

                spawnPosition.x,

                spawnPosition.y,

                spawnPosition.z

            )



            .setGravityScale(

                PROJECTILE_GRAVITY_SCALE

            )



            .setLinearDamping(

                0.02

            )



            .setAngularDamping(

                0.05

            )



            .setCcdEnabled(

                true

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



            .setDensity(

                PROJECTILE_DENSITY

            )



            .setRestitution(

                0.12

            )



            .setFriction(

                0.25

            );





    const collider =

        physicsWorld.createCollider(

            colliderDescription,

            rigidBody

        );





    // ========================================================

    // VELOCIDAD CALCULADA

    // ========================================================



    rigidBody.setLinvel(

        {



            x:

                velocity.x,



            y:

                velocity.y,



            z:

                velocity.z



        },



        true

    );





    // ========================================================

    // GIRO

    // ========================================================



    rigidBody.setAngvel(

        {



            x:

                2.5,



            y:

                1.0,



            z:

                3.5



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

            PROJECTILE_LIFETIME,

        impactedBodies:
            new Set()



    };





    projectiles.push(

        projectile

    );





    // ========================================================

    // YA NO ESTÁ EN LAS MANOS

    // ========================================================



    heldProjectile =

        null;





    console.log(

        '🎯 Objetivo de la mira:',

        targetPosition

    );





    console.log(

        '🤾 Velocidad calculada:',

        velocity

    );





    console.log(

        '🟢 Proyectil lanzado hacia la mira'

    );





    return projectile;



}





// ============================================================

// CANCELAR PELOTA SOSTENIDA

// ============================================================



export function cancelHeldProjectile(

    scene

) {



    if (

        !heldProjectile

    ) {



        return;



    }





    const mesh =

        heldProjectile.mesh;





    scene.remove(

        mesh

    );





    if (

        mesh.geometry

    ) {



        mesh.geometry.dispose();



    }





    if (

        mesh.material

    ) {



        mesh.material.dispose();



    }





    heldProjectile =

        null;



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





    // ========================================================

    // PELOTA TODAVÍA EN LAS MANOS

    // ========================================================



    updateHeldProjectile();





    if (

        !physicsWorld

    ) {



        return;



    }





    // ========================================================

    // PROYECTILES LANZADOS

    // ========================================================



    for (

        let i =

            projectiles.length - 1;



        i >= 0;



        i--

    ) {



        const projectile =

            projectiles[i];





        // ====================================================

        // POSICIÓN RAPIER -> THREE.JS

        // ====================================================



        const position =

            projectile.rigidBody.translation();





        projectile.mesh.position.set(

            position.x,

            position.y,

            position.z

        );





        // ====================================================

        // ROTACIÓN RAPIER -> THREE.JS

        // ====================================================



        const rotation =

            projectile.rigidBody.rotation();





        projectile.mesh.quaternion.set(

            rotation.x,

            rotation.y,

            rotation.z,

            rotation.w

        );


        // ====================================================
        // IMPACTO CONTRA OBJETOS FÍSICOS
        // ====================================================

        applyImpactToDynamicProps(
            projectile
        );






        // ====================================================

        // TIEMPO DE VIDA

        // ====================================================



        projectile.lifetime -=

            deltaTime;





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



    // ========================================================

    // THREE.JS

    // ========================================================



    if (

        projectile.mesh

    ) {



        scene.remove(

            projectile.mesh

        );





        if (

            projectile.mesh.geometry

        ) {



            projectile.mesh.geometry.dispose();



        }





        if (

            projectile.mesh.material

        ) {



            projectile.mesh.material.dispose();



        }



    }





    // ========================================================

    // RAPIER

    // ========================================================



    if (

        projectile.rigidBody

    ) {



        physicsWorld.removeRigidBody(

            projectile.rigidBody

        );



    }



}





// ============================================================

// OBTENER PROYECTILES

// ============================================================



export function getProjectiles() {



    return projectiles;



}