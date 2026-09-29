import * as THREE from 'three';

import {

    getPhysicsWorld

} from './physics.js';


// ============================================================
// ESCALERAS INTERACTIVAS
// ============================================================
//
// E = subir / bajar.
//
// Las coordenadas de detección vienen de los puntos
// que obtuviste con la mira del proyectil.
//
// La transición usa un pequeño fundido a negro.
// Esto evita que el personaje atraviese visualmente
// cada escalón y hace la interacción más limpia.
// ============================================================


// ============================================================
// PUNTOS DETECTADOS CON LA MIRA
// ============================================================

// Parte inferior de las escaleras.
const STAIR_BOTTOM_TRIGGER =
    new THREE.Vector3(

        -15.988395113014336,

        4.281110324586976,

        10.27205583178966

    );


// Parte superior de las escaleras.
const STAIR_TOP_TRIGGER =
    new THREE.Vector3(

        -15.400984366755756,

        7.009417214834778,

        11.27647568697617

    );


// ============================================================
// POSICIONES DE LLEGADA
// ============================================================
//
// No ponemos al personaje exactamente sobre el punto
// de la mira porque ese punto pertenece a la geometría
// de la escalera.
//
// Lo desplazamos un poco hacia afuera para dejarlo
// en una zona más cómoda al terminar la transición.
// ============================================================

const STAIR_BOTTOM_DESTINATION =
    new THREE.Vector3(

        -17.45,

        3.63,

        9.62

    );


const STAIR_TOP_DESTINATION =
    new THREE.Vector3(

        -15.022360355465,

        6.94,

        11.923888392320

    );


// ============================================================
// CONFIGURACIÓN
// ============================================================

// Distancia horizontal para mostrar [E].
const INTERACTION_RADIUS =
    2.15;


// Diferencia vertical permitida respecto
// al punto de interacción.
const INTERACTION_VERTICAL_RANGE =
    1.50;


// Tiempo de fundido antes del cambio de piso.
const FADE_IN_TIME =
    220;


// Tiempo antes de retirar el fundido.
const FADE_OUT_DELAY =
    170;


// Evita activar inmediatamente la escalera
// otra vez al aparecer en el otro extremo.
const INTERACTION_COOLDOWN =
    850;


// ============================================================
// ESTADO
// ============================================================

let configuredPlayer =
    null;


let configuredCamera =
    null;


let configuredControls =
    null;


let transitionCallback =
    null;


let promptElement =
    null;


let fadeElement =
    null;


let transitionActive =
    false;


let currentInteraction =
    null;


let interactionCooldown =
    false;


let listenerInstalled =
    false;


// ============================================================
// VECTORES TEMPORALES
// ============================================================

const stairDirection =
    new THREE.Vector3();


const playerHorizontal =
    new THREE.Vector2();


const triggerHorizontal =
    new THREE.Vector2();


// ============================================================
// CREAR MENSAJE [E]
// ============================================================

function ensurePrompt() {

    if (
        promptElement
    ) {

        return promptElement;

    }


    promptElement =
        document.createElement(
            'div'
        );


    promptElement.id =
        'stairs-interaction-prompt';


    Object.assign(
        promptElement.style,
        {

            position:
                'fixed',

            left:
                '50%',

            bottom:
                '90px',

            transform:
                'translateX(-50%)',

            zIndex:
                '2000',

            padding:
                '10px 16px',

            border:
                '1px solid rgba(255,255,255,0.40)',

            borderRadius:
                '7px',

            background:
                'rgba(8, 11, 14, 0.82)',

            color:
                '#ffffff',

            fontFamily:
                'system-ui, sans-serif',

            fontSize:
                '14px',

            fontWeight:
                '700',

            letterSpacing:
                '0.04em',

            boxShadow:
                '0 6px 24px rgba(0,0,0,0.25)',

            backdropFilter:
                'blur(5px)',

            pointerEvents:
                'none',

            opacity:
                '0',

            transition:
                'opacity 120ms ease'

        }
    );


    document.body.appendChild(
        promptElement
    );


    return promptElement;

}


// ============================================================
// CREAR FUNDIDO
// ============================================================

function ensureFade() {

    if (
        fadeElement
    ) {

        return fadeElement;

    }


    fadeElement =
        document.createElement(
            'div'
        );


    fadeElement.id =
        'stairs-fade';


    Object.assign(
        fadeElement.style,
        {

            position:
                'fixed',

            inset:
                '0',

            zIndex:
                '9999',

            background:
                '#000000',

            opacity:
                '0',

            pointerEvents:
                'none',

            transition:
                `opacity ${FADE_IN_TIME}ms ease`

        }
    );


    document.body.appendChild(
        fadeElement
    );


    return fadeElement;

}


// ============================================================
// MOSTRAR / OCULTAR PROMPT
// ============================================================

function showPrompt(
    text
) {

    const prompt =
        ensurePrompt();


    prompt.textContent =
        text;


    prompt.style.opacity =
        '1';

}


function hidePrompt() {

    if (
        !promptElement
    ) {

        return;

    }


    promptElement.style.opacity =
        '0';

}


// ============================================================
// PROXIMIDAD A UN PUNTO
// ============================================================

function isNearTrigger(
    player,
    trigger
) {

    if (
        !player
    ) {

        return false;

    }


    const verticalDifference =
        Math.abs(

            player.position.y -
            trigger.y

        );


    if (
        verticalDifference >
        INTERACTION_VERTICAL_RANGE
    ) {

        return false;

    }


    playerHorizontal.set(

        player.position.x,

        player.position.z

    );


    triggerHorizontal.set(

        trigger.x,

        trigger.z

    );


    return playerHorizontal
        .distanceTo(
            triggerHorizontal
        ) <=
        INTERACTION_RADIUS;

}


// ============================================================
// BUSCAR EL RIGID BODY DEL PERSONAJE
// ============================================================
//
// El physics.js actual no expone directamente el rigid body.
//
// Por eso buscamos el cuerpo cinemático más cercano
// a la posición visual del personaje.
//
// El cuerpo del jugador debe ser el más próximo.
// ============================================================

function findPlayerRigidBody(
    player
) {

    const physicsWorld =
        getPhysicsWorld();


    if (
        !physicsWorld ||
        !player ||
        typeof physicsWorld.forEachRigidBody !==
            'function'
    ) {

        return null;

    }


    let nearestBody =
        null;


    let nearestDistanceSquared =
        Infinity;


    physicsWorld.forEachRigidBody(
        (body) => {

            // Si Rapier ofrece isKinematic(),
            // ignoramos cuerpos que no sean cinemáticos.
            if (
                typeof body.isKinematic ===
                    'function' &&
                !body.isKinematic()
            ) {

                return;

            }


            const position =
                body.translation();


            const dx =
                position.x -
                player.position.x;


            const dy =
                position.y -
                player.position.y;


            const dz =
                position.z -
                player.position.z;


            const distanceSquared =
                dx * dx +
                dy * dy +
                dz * dz;


            if (
                distanceSquared <
                nearestDistanceSquared
            ) {

                nearestDistanceSquared =
                    distanceSquared;


                nearestBody =
                    body;

            }

        }
    );


    // Seguridad:
    // si el cuerpo más cercano está absurdamente lejos,
    // preferimos no mover nada.
    if (
        nearestDistanceSquared >
        6.25
    ) {

        return null;

    }


    return nearestBody;

}


// ============================================================
// TELETRANSPORTAR PERSONAJE + RAPIER
// ============================================================

function teleportPlayer(
    player,
    destination,
    facingDirection
) {

    if (
        !player
    ) {

        return;

    }


    // ========================================================
    // CUERPO FÍSICO
    // ========================================================

    const playerBody =
        findPlayerRigidBody(
            player
        );


    if (
        playerBody
    ) {

        // ====================================================
        // CONSERVAR OFFSET ENTRE MODELO Y RIGID BODY
        // ====================================================
        //
        // El rigid body de Rapier no tiene por qué usar la
        // misma Y que los pies del modelo visual.
        //
        // La versión anterior hacía:
        //
        // body.y = destination.y
        //
        // Eso podía colocar el CENTRO de la cápsula a la
        // altura del piso y por eso el personaje se enterraba.
        //
        // Ahora medimos la diferencia real que ya existe
        // entre el modelo y su cuerpo físico y la conservamos
        // durante el cambio de piso.
        // ====================================================

        const currentBodyPosition =
            playerBody.translation();


        const bodyOffsetX =
            currentBodyPosition.x -
            player.position.x;


        const bodyOffsetY =
            currentBodyPosition.y -
            player.position.y;


        const bodyOffsetZ =
            currentBodyPosition.z -
            player.position.z;


        const physicsDestination =
            {

                x:
                    destination.x +
                    bodyOffsetX,

                y:
                    destination.y +
                    bodyOffsetY,

                z:
                    destination.z +
                    bodyOffsetZ

            };


        console.log(
            '🪜 Offset modelo ↔ Rapier:',
            {

                x:
                    bodyOffsetX,

                y:
                    bodyOffsetY,

                z:
                    bodyOffsetZ

            }
        );


        console.log(
            '🪜 Destino visual:',
            {

                x:
                    destination.x,

                y:
                    destination.y,

                z:
                    destination.z

            }
        );


        console.log(
            '🪜 Destino físico:',
            physicsDestination
        );


        // Movimiento inmediato del cuerpo físico.
        if (
            typeof playerBody.setTranslation ===
                'function'
        ) {

            playerBody.setTranslation(

                physicsDestination,

                true

            );

        }


        // Como el cuerpo es kinematicPositionBased,
        // dejamos la misma posición preparada para
        // el siguiente paso de simulación.
        if (
            typeof playerBody.setNextKinematicTranslation ===
                'function'
        ) {

            playerBody.setNextKinematicTranslation(
                physicsDestination
            );

        }

    } else {

        console.warn(
            '⚠️ No se encontró el rigid body del personaje. Se moverá solo el modelo visual.'
        );

    }


    // ========================================================
    // MODELO THREE.JS
    // ========================================================
    //
    // Las coordenadas de destino sí representan la altura
    // visual correcta de los pies del personaje.
    // ========================================================

    player.position.set(

        destination.x,

        destination.y,

        destination.z

    );


    // ========================================================
    // ORIENTACIÓN
    // ========================================================

    if (
        facingDirection &&
        facingDirection.lengthSq() >
            0.000001
    ) {

        const direction =
            facingDirection.clone();


        direction.y =
            0;


        direction.normalize();


        const yaw =
            Math.atan2(

                direction.x,

                direction.z

            );


        player.rotation.y =
            yaw;

    }

}


// ============================================================
// TRANSICIÓN
// ============================================================

function beginTransition(
    direction
) {

    if (
        transitionActive ||
        interactionCooldown ||
        !configuredPlayer
    ) {

        return;

    }


    transitionActive =
        true;


    currentInteraction =
        null;


    hidePrompt();


    const fade =
        ensureFade();


    // ========================================================
    // DIRECCIÓN DE LA ESCALERA
    // ========================================================

    stairDirection
        .copy(
            STAIR_TOP_TRIGGER
        )
        .sub(
            STAIR_BOTTOM_TRIGGER
        );


    stairDirection.y =
        0;


    stairDirection.normalize();


    // ========================================================
    // FUNDIDO
    // ========================================================

    requestAnimationFrame(
        () => {

            fade.style.opacity =
                '1';

        }
    );


    window.setTimeout(
        () => {

            if (
                direction ===
                'up'
            ) {

                teleportPlayer(

                    configuredPlayer,

                    STAIR_TOP_DESTINATION,

                    stairDirection

                );

            } else {

                const downDirection =
                    stairDirection
                        .clone()
                        .multiplyScalar(
                            -1
                        );


                teleportPlayer(

                    configuredPlayer,

                    STAIR_BOTTOM_DESTINATION,

                    downDirection

                );

            }


            // =================================================
            // CÁMARA
            // =================================================

            if (
                typeof transitionCallback ===
                    'function'
            ) {

                transitionCallback(
                    configuredPlayer
                );

            }


            // =================================================
            // RETIRAR FUNDIDO
            // =================================================

            window.setTimeout(
                () => {

                    fade.style.opacity =
                        '0';


                    transitionActive =
                        false;


                    interactionCooldown =
                        true;


                    window.setTimeout(
                        () => {

                            interactionCooldown =
                                false;

                        },
                        INTERACTION_COOLDOWN
                    );

                },
                FADE_OUT_DELAY
            );

        },
        FADE_IN_TIME
    );

}


// ============================================================
// TECLA E
// ============================================================

function installInteractionListener() {

    if (
        listenerInstalled
    ) {

        return;

    }


    listenerInstalled =
        true;


    window.addEventListener(
        'keydown',
        (event) => {

            if (
                event.code !==
                    'KeyE' ||
                event.repeat ||
                transitionActive ||
                interactionCooldown
            ) {

                return;

            }


            if (
                currentInteraction ===
                    'up'
            ) {

                beginTransition(
                    'up'
                );

            } else if (
                currentInteraction ===
                    'down'
            ) {

                beginTransition(
                    'down'
                );

            }

        }
    );

}


// ============================================================
// CONFIGURAR
// ============================================================

export function setupStairs({

    player,

    camera,

    controls,

    onTransitionComplete =
        null

}) {

    configuredPlayer =
        player;


    configuredCamera =
        camera;


    configuredControls =
        controls;


    transitionCallback =
        onTransitionComplete;


    ensurePrompt();


    ensureFade();


    installInteractionListener();


    console.log(
        '🪜 Escaleras interactivas activadas.'
    );


    console.log(
        'E = subir / bajar escaleras'
    );

}


// ============================================================
// UPDATE
// ============================================================

export function updateStairs(
    player
) {

    if (
        player
    ) {

        configuredPlayer =
            player;

    }


    if (
        !configuredPlayer ||
        transitionActive ||
        interactionCooldown
    ) {

        hidePrompt();


        return;

    }


    // ========================================================
    // ABAJO
    // ========================================================

    if (
        isNearTrigger(

            configuredPlayer,

            STAIR_BOTTOM_TRIGGER

        )
    ) {

        currentInteraction =
            'up';


        showPrompt(
            '[E] Subir escaleras'
        );


        return;

    }


    // ========================================================
    // ARRIBA
    // ========================================================

    if (
        isNearTrigger(

            configuredPlayer,

            STAIR_TOP_TRIGGER

        )
    ) {

        currentInteraction =
            'down';


        showPrompt(
            '[E] Bajar escaleras'
        );


        return;

    }


    currentInteraction =
        null;


    hidePrompt();

}


// ============================================================
// ESTADO
// ============================================================

export function isStairTransitionActive() {

    return transitionActive;

}
