import * as THREE from 'three';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import {
    movePlayerWithPhysics
} from './physics.js';


// ============================================================
// VARIABLES DEL PERSONAJE
// ============================================================

let player =
    null;

let mixer =
    null;

let currentAction =
    null;

let actionLocked =
    false;


// ============================================================
// EVENTO DE LANZAMIENTO
// ============================================================

let throwReleaseCallback =
    null;

let throwStartCallback =
    null;

let throwElapsed =
    0;

let throwReleased =
    false;


// Momento en que se suelta la pelota.
//
// 0.50 = aproximadamente a la mitad
// de la animación Throw.
const THROW_RELEASE_RATIO =
    0.50;


let throwReleaseTime =
    0;


// ============================================================
// ACCIONES DE ANIMACIÓN
// ============================================================

const actions =
    {};


// ============================================================
// CONFIGURACIÓN DE MOVIMIENTO
// ============================================================

const WALK_SPEED =
    2.2;

const RUN_SPEED =
    4.5;


// ============================================================
// TECLAS
// ============================================================

const keyStates = {

    forward:
        false,

    backward:
        false,

    left:
        false,

    right:
        false,

    run:
        false

};


// ============================================================
// VECTORES REUTILIZABLES
// ============================================================

// Dirección frontal de la cámara.
const cameraForward =
    new THREE.Vector3();


// Dirección derecha de la cámara.
const cameraRight =
    new THREE.Vector3();


// Movimiento final.
const moveDirection =
    new THREE.Vector3();


// Frente actual del personaje.
const playerForward =
    new THREE.Vector3();


// Derecha actual del personaje.
const playerRight =
    new THREE.Vector3();


const worldUp =
    new THREE.Vector3(
        0,
        1,
        0
    );


const targetQuaternion =
    new THREE.Quaternion();


const targetEuler =
    new THREE.Euler(
        0,
        0,
        0,
        'YXZ'
    );


// ============================================================
// EVENTOS DE TECLADO
// ============================================================

window.addEventListener(
    'keydown',
    (event) => {

        switch (
            event.code
        ) {

            case 'KeyW':

                keyStates.forward =
                    true;

                break;


            case 'KeyS':

                keyStates.backward =
                    true;

                break;


            case 'KeyA':

                keyStates.left =
                    true;

                break;


            case 'KeyD':

                keyStates.right =
                    true;

                break;


            case 'KeyF':

                triggerThrow();

                break;


            case 'ShiftLeft':
            case 'ShiftRight':

                keyStates.run =
                    true;

                break;

        }

    }
);


window.addEventListener(
    'keyup',
    (event) => {

        switch (
            event.code
        ) {

            case 'KeyW':

                keyStates.forward =
                    false;

                break;


            case 'KeyS':

                keyStates.backward =
                    false;

                break;


            case 'KeyA':

                keyStates.left =
                    false;

                break;


            case 'KeyD':

                keyStates.right =
                    false;

                break;


            case 'ShiftLeft':
            case 'ShiftRight':

                keyStates.run =
                    false;

                break;

        }

    }
);


// ============================================================
// EVITAR TECLAS ATASCADAS
// ============================================================

window.addEventListener(
    'blur',
    () => {

        keyStates.forward =
            false;

        keyStates.backward =
            false;

        keyStates.left =
            false;

        keyStates.right =
            false;

        keyStates.run =
            false;

    }
);


// ============================================================
// CONVERTIR ANIMACIÓN A "IN PLACE"
// ============================================================

function makeClipInPlace(
    originalClip
) {

    const clip =
        originalClip.clone();


    clip.tracks.forEach(
        (track) => {

            const trackName =
                track.name.toLowerCase();


            // Evitamos que la animación
            // mueva físicamente las caderas
            // en X/Z.
            if (
                trackName.includes(
                    'hips.position'
                )
            ) {

                const values =
                    track.values;


                if (
                    values.length >= 3
                ) {

                    const initialX =
                        values[0];

                    const initialZ =
                        values[2];


                    for (
                        let i = 0;
                        i < values.length;
                        i += 3
                    ) {

                        values[i] =
                            initialX;

                        values[i + 2] =
                            initialZ;

                    }

                }

            }

        }
    );


    return clip;

}


// ============================================================
// CALLBACK AL INICIAR THROW
// ============================================================

export function setThrowStartCallback(
    callback
) {

    throwStartCallback =
        typeof callback === 'function'
            ? callback
            : null;

}


// ============================================================
// CALLBACK AL SOLTAR EL PROYECTIL
// ============================================================

export function setThrowReleaseCallback(
    callback
) {

    throwReleaseCallback =
        typeof callback === 'function'
            ? callback
            : null;

}


// ============================================================
// CARGAR PERSONAJE
// ============================================================

export function loadPlayer(
    scene,
    spawnPosition = new THREE.Vector3(
        0,
        0,
        0
    )
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const loader =
                new GLTFLoader();


            loader.load(

                './assets/models/character/character_animated.glb',


                // ====================================================
                // PERSONAJE CARGADO
                // ====================================================

                (gltf) => {

                    player =
                        gltf.scene;


                    // =================================================
                    // ORIENTACIÓN INICIAL
                    // =================================================

                    player.rotation.y =
                        Math.PI;


                    // =================================================
                    // POSICIÓN INICIAL
                    // =================================================

                    player.position.copy(
                        spawnPosition
                    );


                    // =================================================
                    // SOMBRAS
                    // =================================================

                    player.traverse(
                        (object) => {

                            if (
                                object.isMesh
                            ) {

                                object.castShadow =
                                    true;

                                object.receiveShadow =
                                    true;

                            }

                        }
                    );


                    // =================================================
                    // ANIMATION MIXER
                    // =================================================

                    mixer =
                        new THREE.AnimationMixer(
                            player
                        );


                    // =================================================
                    // REGISTRAR ANIMACIONES
                    // =================================================

                    gltf.animations.forEach(
                        (originalClip) => {

                            const clip =
                                makeClipInPlace(
                                    originalClip
                                );


                            const animationName =
                                clip.name.toLowerCase();


                            // -----------------------------------------
                            // IDLE
                            // -----------------------------------------

                            if (
                                animationName.includes(
                                    'idle'
                                )
                            ) {

                                actions.Idle =
                                    mixer.clipAction(
                                        clip
                                    );

                            }


                            // -----------------------------------------
                            // WALK
                            // -----------------------------------------

                            if (
                                animationName.includes(
                                    'walk'
                                )
                            ) {

                                actions.Walk =
                                    mixer.clipAction(
                                        clip
                                    );


                                actions.Walk.setLoop(
                                    THREE.LoopRepeat,
                                    Infinity
                                );

                            }


                            // -----------------------------------------
                            // RUN
                            // -----------------------------------------

                            if (
                                animationName.includes(
                                    'run'
                                )
                            ) {

                                actions.Run =
                                    mixer.clipAction(
                                        clip
                                    );


                                actions.Run.setLoop(
                                    THREE.LoopRepeat,
                                    Infinity
                                );

                            }


                            // -----------------------------------------
                            // THROW
                            // -----------------------------------------

                            if (
                                animationName.includes(
                                    'throw'
                                )
                            ) {

                                actions.Throw =
                                    mixer.clipAction(
                                        clip
                                    );


                                actions.Throw.setLoop(
                                    THREE.LoopOnce,
                                    1
                                );


                                actions.Throw.clampWhenFinished =
                                    true;

                            }

                        }
                    );


                    // =================================================
                    // CUANDO TERMINA THROW
                    // =================================================

                    mixer.addEventListener(
                        'finished',
                        (event) => {

                            if (
                                event.action !==
                                actions.Throw
                            ) {

                                return;

                            }


                            // Desbloquear personaje.
                            actionLocked =
                                false;


                            // Detener Throw.
                            actions.Throw.stop();


                            currentAction =
                                null;


                            throwElapsed =
                                0;


                            throwReleased =
                                false;


                            throwReleaseTime =
                                0;


                            // Volver a Idle.
                            playAnimation(
                                'Idle'
                            );

                        }
                    );


                    // =================================================
                    // AGREGAR PERSONAJE
                    // =================================================

                    scene.add(
                        player
                    );


                    // =================================================
                    // ANIMACIÓN INICIAL
                    // =================================================

                    playAnimation(
                        'Idle'
                    );


                    // =================================================
                    // CONSOLA
                    // =================================================

                    console.log(
                        '✅ Personaje cargado correctamente'
                    );


                    console.log(
                        '🎬 Animaciones encontradas:',
                        gltf.animations.map(
                            (animation) =>
                                animation.name
                        )
                    );


                    console.log(
                        '🎮 Acciones registradas:',
                        Object.keys(
                            actions
                        )
                    );


                    resolve(
                        player
                    );

                },


                // ====================================================
                // PROGRESO
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
                                ) *
                                100
                            );


                        console.log(
                            `👤 Cargando personaje: ${percent}%`
                        );

                    }

                },


                // ====================================================
                // ERROR
                // ====================================================

                (error) => {

                    console.error(
                        '❌ Error cargando personaje:',
                        error
                    );


                    reject(
                        error
                    );

                }

            );

        }
    );

}


// ============================================================
// CAMBIAR ANIMACIÓN GENERAL
// ============================================================

export function playAnimation(
    animationName
) {

    // Walk tiene una función especial
    // porque puede reproducirse hacia atrás.
    if (
        animationName === 'Walk'
    ) {

        playWalkAnimation(
            false
        );


        return;

    }


    const nextAction =
        actions[
            animationName
        ];


    if (
        !nextAction
    ) {

        console.warn(
            `⚠️ Animación no encontrada: ${animationName}`
        );


        return;

    }


    if (
        currentAction ===
        nextAction
    ) {

        return;

    }


    // ========================================================
    // DESVANECER ANIMACIÓN ANTERIOR
    // ========================================================

    if (
        currentAction
    ) {

        currentAction.fadeOut(
            0.18
        );

    }


    // ========================================================
    // ASEGURAR VELOCIDAD NORMAL
    // ========================================================

    nextAction.setEffectiveTimeScale(
        1
    );


    // ========================================================
    // REPRODUCIR
    // ========================================================

    nextAction
        .reset()
        .fadeIn(
            0.18
        )
        .play();


    currentAction =
        nextAction;

}


// ============================================================
// WALK NORMAL / WALK EN REVERSA
// ============================================================
//
// Esta función permite usar el mismo clip:
//
// WALK NORMAL:
//
//      👤 →
//
// WALK EN REVERSA:
//
// ← 👤
//
// El personaje conserva su orientación.
//
// ============================================================

function playWalkAnimation(
    reverse = false
) {

    const walkAction =
        actions.Walk;


    if (
        !walkAction
    ) {

        console.warn(
            '⚠️ Animación Walk no encontrada'
        );


        return;

    }


    const desiredTimeScale =
        reverse
            ? -1
            : 1;


    // ========================================================
    // WALK YA SE ESTÁ REPRODUCIENDO
    // ========================================================
    //
    // Si pasamos de W a S o de S a W,
    // simplemente cambiamos el sentido del tiempo.
    //
    // Esto evita reiniciar constantemente la animación.
    // ========================================================

    if (
        currentAction ===
        walkAction
    ) {

        walkAction.paused =
            false;


        // Si queremos retroceder y justo estamos
        // al principio del clip, saltamos al final.
        if (
            reverse &&
            walkAction.time <= 0.001
        ) {

            walkAction.time =
                walkAction.getClip().duration;

        }


        // Si queremos avanzar y estamos exactamente
        // al final, regresamos al comienzo.
        if (
            !reverse &&
            walkAction.time >=
                walkAction.getClip().duration - 0.001
        ) {

            walkAction.time =
                0;

        }


        walkAction.setEffectiveTimeScale(
            desiredTimeScale
        );


        return;

    }


    // ========================================================
    // CAMBIAR DESDE OTRA ANIMACIÓN
    // ========================================================

    if (
        currentAction
    ) {

        currentAction.fadeOut(
            0.18
        );

    }


    walkAction.reset();


    walkAction.setLoop(
        THREE.LoopRepeat,
        Infinity
    );


    // Al reproducir hacia atrás debemos
    // comenzar desde el final del clip.
    if (
        reverse
    ) {

        walkAction.time =
            walkAction.getClip().duration;

    } else {

        walkAction.time =
            0;

    }


    walkAction.setEffectiveTimeScale(
        desiredTimeScale
    );


    walkAction
        .fadeIn(
            0.18
        )
        .play();


    currentAction =
        walkAction;

}


// ============================================================
// ANIMACIÓN DE LANZAMIENTO
// ============================================================

export function triggerThrow() {

    if (
        !player ||
        !mixer ||
        !actions.Throw ||
        actionLocked
    ) {

        return;

    }


    // ========================================================
    // BLOQUEAR MOVIMIENTO
    // ========================================================

    actionLocked =
        true;


    throwElapsed =
        0;


    throwReleased =
        false;


    // ========================================================
    // MOMENTO DE LIBERACIÓN
    // ========================================================

    const throwDuration =
        actions.Throw
            .getClip()
            .duration;


    throwReleaseTime =
        throwDuration *
        THROW_RELEASE_RATIO;


    // ========================================================
    // CREAR PELOTA EN LAS MANOS
    // ========================================================

    if (
        throwStartCallback
    ) {

        throwStartCallback(
            player
        );

    }


    // ========================================================
    // DESVANECER ANIMACIÓN ACTUAL
    // ========================================================

    if (
        currentAction
    ) {

        currentAction.fadeOut(
            0.12
        );

    }


    // ========================================================
    // THROW
    // ========================================================

    const throwAction =
        actions.Throw;


    throwAction.reset();


    throwAction.setEffectiveTimeScale(
        1
    );


    throwAction.setLoop(
        THREE.LoopOnce,
        1
    );


    throwAction.clampWhenFinished =
        true;


    throwAction.fadeIn(
        0.12
    );


    throwAction.play();


    currentAction =
        throwAction;

}


// ============================================================
// OBTENER FRENTE Y DERECHA DEL PERSONAJE
// ============================================================
//
// Estos vectores son especialmente importantes
// para retroceder.
//
// Al presionar S ya NO usamos:
//     -cameraForward
//
// Usamos:
//     -playerForward
//
// Así el personaje realmente camina hacia atrás
// según su propia orientación.
// ============================================================

function updatePlayerDirections() {

    if (
        !player
    ) {

        return;

    }


    // ========================================================
    // FRENTE
    // ========================================================

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

    }


    // ========================================================
    // DERECHA
    // ========================================================

    playerRight.set(
        1,
        0,
        0
    );


    playerRight.applyQuaternion(
        player.quaternion
    );


    playerRight.y =
        0;


    if (
        playerRight.lengthSq() >
        0.000001
    ) {

        playerRight.normalize();

    }

}


// ============================================================
// ACTUALIZAR PERSONAJE
// ============================================================

export function updatePlayer(
    deltaTime,
    camera
) {

    // ========================================================
    // ACTUALIZAR ANIMACIONES
    // ========================================================

    if (
        mixer
    ) {

        mixer.update(
            deltaTime
        );

    }


    if (
        !player ||
        !camera
    ) {

        return player;

    }


    // ========================================================
    // MOMENTO DE LIBERAR EL PROYECTIL
    // ========================================================

    if (
        actionLocked &&
        currentAction ===
            actions.Throw
    ) {

        throwElapsed +=
            deltaTime;


        if (
            !throwReleased &&
            throwElapsed >=
                throwReleaseTime
        ) {

            throwReleased =
                true;


            if (
                throwReleaseCallback
            ) {

                throwReleaseCallback(
                    player
                );

            }

        }

    }


    // ========================================================
    // ACCIÓN TEMPORAL BLOQUEADA
    // ========================================================

    if (
        actionLocked
    ) {

        return player;

    }


    // ========================================================
    // DIRECCIÓN DE LA CÁMARA
    // ========================================================

    camera.getWorldDirection(
        cameraForward
    );


    // Ignorar inclinación vertical.
    cameraForward.y =
        0;


    if (
        cameraForward.lengthSq() >
        0.000001
    ) {

        cameraForward.normalize();

    }


    // ========================================================
    // DERECHA DE LA CÁMARA
    // ========================================================

    cameraRight.crossVectors(
        cameraForward,
        worldUp
    );


    if (
        cameraRight.lengthSq() >
        0.000001
    ) {

        cameraRight.normalize();

    }


    // ========================================================
    // DIRECCIÓN ACTUAL DEL PERSONAJE
    // ========================================================

    updatePlayerDirections();


    // ========================================================
    // ¿ESTAMOS RETROCEDIENDO?
    // ========================================================
    //
    // Solo consideramos retroceso cuando S está presionada
    // y W no.
    //
    // ========================================================

    const isMovingBackward =
        keyStates.backward &&
        !keyStates.forward;


    // ========================================================
    // CALCULAR MOVIMIENTO
    // ========================================================

    moveDirection.set(
        0,
        0,
        0
    );


    // ========================================================
    // MOVIMIENTO HACIA ATRÁS
    // ========================================================
    //
    // Aquí NO usamos la dirección de la cámara.
    //
    // El movimiento depende de la orientación actual
    // del propio personaje.
    //
    // De esta forma S significa:
    //
    //      ↑ personaje mira aquí
    //      👤
    //      ↓ camina hacia atrás
    //
    // ========================================================

    if (
        isMovingBackward
    ) {

        // Retroceder.
        moveDirection.sub(
            playerForward
        );


        // Retroceso diagonal hacia la derecha.
        if (
            keyStates.right
        ) {

            moveDirection.add(
                playerRight
            );

        }


        // Retroceso diagonal hacia la izquierda.
        if (
            keyStates.left
        ) {

            moveDirection.sub(
                playerRight
            );

        }

    }


    // ========================================================
    // MOVIMIENTO NORMAL
    // ========================================================

    else {

        if (
            keyStates.forward
        ) {

            moveDirection.add(
                cameraForward
            );

        }


        // Si W y S están presionadas al mismo tiempo,
        // se cancelan.
        if (
            keyStates.backward
        ) {

            moveDirection.sub(
                cameraForward
            );

        }


        if (
            keyStates.right
        ) {

            moveDirection.add(
                cameraRight
            );

        }


        if (
            keyStates.left
        ) {

            moveDirection.sub(
                cameraRight
            );

        }

    }


    // ========================================================
    // ¿HAY MOVIMIENTO?
    // ========================================================

    const isMoving =
        moveDirection.lengthSq() >
        0.000001;


    let currentSpeed =
        0;


    // ========================================================
    // PERSONAJE EN MOVIMIENTO
    // ========================================================

    if (
        isMoving
    ) {

        moveDirection.normalize();


        // ====================================================
        // CORRER
        // ====================================================
        //
        // Por ahora no permitimos correr hacia atrás.
        //
        // Shift + S continúa siendo caminata.
        //
        // ====================================================

        const isRunning =
            keyStates.run &&
            !isMovingBackward;


        currentSpeed =
            isRunning
                ? RUN_SPEED
                : WALK_SPEED;


        // ====================================================
        // ROTACIÓN DEL PERSONAJE
        // ====================================================
        //
        // IMPORTANTE:
        //
        // Si camina hacia atrás NO rotamos.
        //
        // Conservamos la orientación actual.
        //
        // ====================================================

        if (
            !isMovingBackward
        ) {

            const targetRotation =
                Math.atan2(
                    moveDirection.x,
                    moveDirection.z
                );


            targetEuler.set(
                0,
                targetRotation,
                0
            );


            targetQuaternion.setFromEuler(
                targetEuler
            );


            // Giro suave.
            const rotationFactor =
                1 -
                Math.exp(
                    -12 *
                    deltaTime
                );


            player.quaternion.slerp(
                targetQuaternion,
                rotationFactor
            );

        }


        // ====================================================
        // ANIMACIÓN
        // ====================================================

        if (
            isMovingBackward
        ) {

            // -----------------------------------------------
            // WALK EN REVERSA
            // -----------------------------------------------

            playWalkAnimation(
                true
            );

        }

        else if (
            isRunning
        ) {

            // -----------------------------------------------
            // RUN
            // -----------------------------------------------

            playAnimation(
                'Run'
            );

        }

        else {

            // -----------------------------------------------
            // WALK NORMAL
            // -----------------------------------------------

            playWalkAnimation(
                false
            );

        }

    }


    // ========================================================
    // PERSONAJE QUIETO
    // ========================================================

    else {

        playAnimation(
            'Idle'
        );

    }


    // ========================================================
    // MOVIMIENTO CONTROLADO POR RAPIER
    // ========================================================

    const horizontalMovement =
        new THREE.Vector3();


    if (
        isMoving
    ) {

        horizontalMovement
            .copy(
                moveDirection
            )
            .multiplyScalar(
                currentSpeed *
                deltaTime
            );

    }


    // ========================================================
    // RAPIER
    // ========================================================

    const physicsPosition =
        movePlayerWithPhysics(
            horizontalMovement,
            deltaTime
        );


    // ========================================================
    // ACTUALIZAR MODELO VISUAL
    // ========================================================

    if (
        physicsPosition
    ) {

        player.position.set(
            physicsPosition.x,
            physicsPosition.y,
            physicsPosition.z
        );

    }


    return player;

}


// ============================================================
// OBTENER PERSONAJE
// ============================================================

export function getPlayer() {

    return player;

}