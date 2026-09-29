import * as THREE from 'three';

import {
    getPhysicsWorld,
    getRapier
} from './physics.js';

import {
    getProjectiles
} from './projectiles.js';


// ============================================================
// CONFIGURACIÓN DE LA MISIÓN
// ============================================================

// Cantidad de núcleos que aparecerán en cada partida.
const TOTAL_CORES =
    5;


// Tamaño visual/físico del núcleo.
const CORE_RADIUS =
    0.38;


// Distancia para detectar el impacto del proyectil.
const CORE_HIT_DISTANCE =
    0.52;


// Las coordenadas fueron tomadas estando parado
// sobre un lugar accesible.
//
// Sumamos esta altura para que el núcleo quede flotando
// frente al jugador y no enterrado en el piso.
const CORE_VERTICAL_OFFSET =
    0.85;


// ============================================================
// POSICIONES DISPONIBLES
// ============================================================
//
// Tenemos 8 lugares comprobados manualmente.
//
// En cada recarga se eligen 5 SIN REPETIR.
//
// Los IDs representan el punto registrado,
// no necesariamente el orden en que aparecerá
// dentro de la misión.
// ============================================================

const CORE_POSITIONS =
    [

        {
            id: 1,
            x: 11.68,
            y: 6.94,
            z: 15.97
        },

        {
            id: 2,
            x: -12.87,
            y: 6.93,
            z: 10.80
        },

        {
            id: 3,
            x: -1.95,
            y: 6.95,
            z: 4.15
        },

        {
            id: 4,
            x: -21.70,
            y: 3.73,
            z: 2.37
        },

        {
            id: 5,
            x: -21.13,
            y: 3.63,
            z: 15.89
        },

        {
            id: 6,
            x: -7.44,
            y: 3.63,
            z: 2.27
        },

        {
            id: 7,
            x: -5.35,
            y: 3.63,
            z: -11.82
        },

        {
            id: 8,
            x: 2.61,
            y: 3.63,
            z: -3.65
        }

    ];


// ============================================================
// ESTADO
// ============================================================

const cores =
    [];


let destroyedCoreCount =
    0;


let coreHudElement =
    null;


// Estado final de la misión.
let missionComplete =
    false;


let victoryOverlayElement =
    null;


// Posiciones elegidas para la partida actual.
let selectedCorePositions =
    [];


// ============================================================
// ELEGIR 5 POSICIONES ALEATORIAS SIN REPETIR
// ============================================================

function chooseRandomCorePositions() {

    // Copia para no alterar CORE_POSITIONS.
    const available =
        CORE_POSITIONS.map(
            (position) => ({
                ...position
            })
        );


    // Fisher-Yates shuffle.
    for (
        let i =
            available.length - 1;

        i > 0;

        i--
    ) {

        const randomIndex =
            Math.floor(
                Math.random() *
                (
                    i + 1
                )
            );


        const temporary =
            available[i];


        available[i] =
            available[
                randomIndex
            ];


        available[
            randomIndex
        ] =
            temporary;

    }


    return available.slice(
        0,
        TOTAL_CORES
    );

}


// ============================================================
// HUD
// ============================================================

function ensureCoreHUD() {

    if (
        coreHudElement
    ) {

        return coreHudElement;

    }


    coreHudElement =
        document.getElementById(
            'core-counter'
        );


    if (
        coreHudElement
    ) {

        return coreHudElement;

    }


    coreHudElement =
        document.createElement(
            'div'
        );


    coreHudElement.id =
        'core-counter';


    Object.assign(
        coreHudElement.style,
        {

            position:
                'fixed',

            top:
                '20px',

            right:
                '20px',

            zIndex:
                '1000',

            padding:
                '10px 14px',

            minWidth:
                '145px',

            border:
                '1px solid rgba(64, 255, 157, 0.65)',

            borderRadius:
                '8px',

            background:
                'rgba(8, 11, 14, 0.82)',

            color:
                '#d9fff0',

            fontFamily:
                'system-ui, sans-serif',

            fontSize:
                '13px',

            fontWeight:
                '700',

            letterSpacing:
                '0.08em',

            textAlign:
                'center',

            boxShadow:
                '0 0 18px rgba(64, 255, 157, 0.12)',

            backdropFilter:
                'blur(6px)',

            pointerEvents:
                'none'

        }
    );


    document.body.appendChild(
        coreHudElement
    );


    return coreHudElement;

}


// ============================================================
// ACTUALIZAR HUD
// ============================================================

function updateCoreHUD() {

    const hud =
        ensureCoreHUD();


    if (
        destroyedCoreCount >=
        TOTAL_CORES
    ) {

        hud.textContent =
            `NÚCLEOS  ${TOTAL_CORES} / ${TOTAL_CORES}  ✓`;


        hud.style.borderColor =
            'rgba(64, 255, 157, 1)';


        hud.style.boxShadow =
            '0 0 24px rgba(64, 255, 157, 0.28)';


        return;

    }


    hud.textContent =
        `NÚCLEOS  ${destroyedCoreCount} / ${TOTAL_CORES}`;

}


// ============================================================
// CREAR VISUAL DEL NÚCLEO
// ============================================================

function createCoreVisual(
    missionIndex
) {

    const group =
        new THREE.Group();


    group.name =
        `EnergyCore_${missionIndex + 1}`;


    // ========================================================
    // ESFERA CENTRAL
    // ========================================================

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
                3,

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


    // ========================================================
    // ANILLO EXTERIOR
    // ========================================================

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
                0.90

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


    // ========================================================
    // ANILLO INTERIOR
    // ========================================================

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


    // ========================================================
    // LUZ
    // ========================================================

    const light =
        new THREE.PointLight(
            0x40ff9d,
            3.2,
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


    group.userData.rotationSpeed =
        0.75 +
        missionIndex *
        0.07;


    return group;

}


// ============================================================
// CREAR SENSOR RAPIER
// ============================================================
//
// El núcleo NO bloquea puertas ni pasillos.
//
// Es un sensor cinemático:
// - el personaje puede atravesarlo;
// - no se comporta como pared;
// - los rayos ONLY_FIXED de cámara/mira lo ignoran.
//
// El golpe del proyectil se detecta por distancia.
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
            '⚠️ Rapier no está disponible para crear el sensor del núcleo.'
        );


        return {

            rigidBody:
                null,

            collider:
                null

        };

    }


    const rigidBodyDescription =
        RAPIER.RigidBodyDesc
            .kinematicPositionBased()
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
            .setSensor(
                true
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
// CREAR UN NÚCLEO
// ============================================================

function createCore(
    scene,
    positionData,
    missionIndex
) {

    const worldPosition =
        new THREE.Vector3(

            positionData.x,

            positionData.y +
            CORE_VERTICAL_OFFSET,

            positionData.z

        );


    // ========================================================
    // VISUAL
    // ========================================================

    const group =
        createCoreVisual(
            missionIndex
        );


    group.position.copy(
        worldPosition
    );


    scene.add(
        group
    );


    // ========================================================
    // SENSOR RAPIER
    // ========================================================

    const {

        rigidBody,

        collider

    } =
        createCorePhysics(
            worldPosition
        );


    const core = {

        // Orden dentro de esta partida: 1-5.
        id:
            missionIndex + 1,

        // Punto original elegido por el usuario: 1-8.
        positionId:
            positionData.id,

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
        `🟢 Núcleo ${core.id}/${TOTAL_CORES} creado usando el punto #${core.positionId}:`,
        worldPosition
    );


    return core;

}


// ============================================================
// PANTALLA DE VICTORIA
// ============================================================

function showVictoryScreen() {

    if (
        victoryOverlayElement
    ) {

        return;

    }


    missionComplete =
        true;


    const gameStateElement =
        document.getElementById(
            'game-state'
        );


    if (
        gameStateElement
    ) {

        gameStateElement.textContent =
            'VICTORIA';

    }


    victoryOverlayElement =
        document.createElement(
            'div'
        );


    victoryOverlayElement.id =
        'victory-overlay';


    Object.assign(
        victoryOverlayElement.style,
        {

            position:
                'fixed',

            inset:
                '0',

            zIndex:
                '10000',

            display:
                'flex',

            alignItems:
                'center',

            justifyContent:
                'center',

            background:
                'rgba(3, 7, 9, 0.78)',

            backdropFilter:
                'blur(6px)',

            opacity:
                '0',

            transition:
                'opacity 280ms ease',

            fontFamily:
                'system-ui, sans-serif'

        }
    );


    const panel =
        document.createElement(
            'div'
        );


    Object.assign(
        panel.style,
        {

            width:
                'min(520px, calc(100vw - 36px))',

            padding:
                '34px 30px',

            border:
                '1px solid rgba(64, 255, 157, 0.65)',

            borderRadius:
                '14px',

            background:
                'rgba(8, 11, 14, 0.95)',

            color:
                '#ffffff',

            textAlign:
                'center',

            boxShadow:
                '0 18px 60px rgba(0,0,0,0.48)'

        }
    );


    const smallTitle =
        document.createElement(
            'div'
        );


    smallTitle.textContent =
        'OPERACIÓN: REACTOR';


    Object.assign(
        smallTitle.style,
        {

            marginBottom:
                '12px',

            color:
                '#40ff9d',

            fontSize:
                '13px',

            fontWeight:
                '800',

            letterSpacing:
                '0.18em'

        }
    );


    const title =
        document.createElement(
            'h2'
        );


    title.textContent =
        'MISIÓN COMPLETADA';


    Object.assign(
        title.style,
        {

            margin:
                '0 0 12px',

            fontSize:
                'clamp(28px, 5vw, 42px)',

            lineHeight:
                '1',

            letterSpacing:
                '0.04em'

        }
    );


    const message =
        document.createElement(
            'p'
        );


    message.textContent =
        `Desactivaste los ${TOTAL_CORES} núcleos de energía.`;


    Object.assign(
        message.style,
        {

            margin:
                '0 0 26px',

            color:
                'rgba(255,255,255,0.78)',

            fontSize:
                '16px',

            lineHeight:
                '1.5'

        }
    );


    const restartButton =
        document.createElement(
            'button'
        );


    restartButton.type =
        'button';


    restartButton.textContent =
        'JUGAR DE NUEVO';


    Object.assign(
        restartButton.style,
        {

            padding:
                '12px 20px',

            border:
                '1px solid #40ff9d',

            borderRadius:
                '8px',

            background:
                'rgba(64,255,157,0.12)',

            color:
                '#ffffff',

            fontSize:
                '14px',

            fontWeight:
                '800',

            letterSpacing:
                '0.08em',

            cursor:
                'pointer'

        }
    );


    restartButton.addEventListener(
        'click',
        () => {

            window.location.reload();

        }
    );


    panel.append(
        smallTitle,
        title,
        message,
        restartButton
    );


    victoryOverlayElement.appendChild(
        panel
    );


    document.body.appendChild(
        victoryOverlayElement
    );


    requestAnimationFrame(
        () => {

            victoryOverlayElement.style.opacity =
                '1';

        }
    );

}


// ============================================================
// CREAR LOS 5 NÚCLEOS ALEATORIOS
// ============================================================

export function createMissionCores(
    scene,
    player
) {

    if (
        !scene ||
        !player
    ) {

        return [];

    }


    // Evitar duplicarlos.
    if (
        cores.length > 0
    ) {

        return cores;

    }


    destroyedCoreCount =
        0;


    missionComplete =
        false;


    updateCoreHUD();


    // ========================================================
    // ELEGIR 5 DE LOS 8
    // ========================================================

    selectedCorePositions =
        chooseRandomCorePositions();


    console.log(
        '🎲 Puntos seleccionados para esta partida:',
        selectedCorePositions.map(
            (position) =>
                position.id
        )
    );


    // ========================================================
    // CREARLOS
    // ========================================================

    selectedCorePositions.forEach(
        (
            positionData,
            index
        ) => {

            createCore(
                scene,
                positionData,
                index
            );

        }
    );


    console.log(
        `🎯 Núcleos creados: ${cores.length}/${TOTAL_CORES}`
    );


    return cores;

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
    // ELIMINAR SENSOR RAPIER
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


    updateCoreHUD();


    console.log(
        `💥 Núcleo ${core.id} destruido (punto #${core.positionId})`
    );


    console.log(
        `🎯 Progreso: ${destroyedCoreCount}/${TOTAL_CORES}`
    );


    if (
        destroyedCoreCount >=
        TOTAL_CORES
    ) {

        console.log(
            '✅ Todos los núcleos fueron destruidos.'
        );


        showVictoryScreen();

    }

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
    // ANIMACIÓN
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


        const rotationSpeed =
            core.group.userData.rotationSpeed ??
            0.8;


        core.group.rotation.y +=
            rotationSpeed *
            deltaTime;


        if (
            core.group.userData.ring1
        ) {

            core.group.userData.ring1.rotation.z +=
                (
                    1.35 +
                    core.id *
                    0.03
                ) *
                deltaTime;

        }


        if (
            core.group.userData.ring2
        ) {

            core.group.userData.ring2.rotation.x +=
                (
                    1.05 +
                    core.id *
                    0.025
                ) *
                deltaTime;

        }

    }


    // ========================================================
    // DETECTAR IMPACTOS
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

                // El projectile.js lo eliminará
                // en el siguiente update.
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
// GETTERS
// ============================================================

export function isMissionComplete() {

    return missionComplete;

}


export function getDestroyedCoreCount() {

    return destroyedCoreCount;

}


export function getTotalCoreCount() {

    return TOTAL_CORES;

}


export function getCores() {

    return cores;

}


export function getSelectedCorePositions() {

    return selectedCorePositions.map(
        (position) => ({
            ...position
        })
    );

}
