import * as THREE from 'three';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';



// VARIABLES DEL PERSONAJE


let player = null;

let mixer = null;

let currentAction = null;

let actionLocked = false;


const actions = {};



// CONFIGURACIÓN DE MOVIMIENTO


const WALK_SPEED = 2.2;

const RUN_SPEED = 4.5;



// TECLAS


const keyStates = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    run: false
};



// VECTORES REUTILIZABLES


const cameraForward =
    new THREE.Vector3();

const cameraRight =
    new THREE.Vector3();

const moveDirection =
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



// EVENTOS DE TECLADO


window.addEventListener(
    'keydown',
    (event) => {

        switch (event.code) {

            case 'KeyW':
                keyStates.forward = true;
                break;

            case 'KeyS':
                keyStates.backward = true;
                break;

            case 'KeyA':
                keyStates.left = true;
                break;

            case 'KeyD':
                keyStates.right = true;
                break;
            case 'KeyF':

                triggerThrow();

                break;

            case 'ShiftLeft':
            case 'ShiftRight':
                keyStates.run = true;
                break;

        }

    }
);


window.addEventListener(
    'keyup',
    (event) => {

        switch (event.code) {

            case 'KeyW':
                keyStates.forward = false;
                break;

            case 'KeyS':
                keyStates.backward = false;
                break;

            case 'KeyA':
                keyStates.left = false;
                break;

            case 'KeyD':
                keyStates.right = false;
                break;

            case 'ShiftLeft':
            case 'ShiftRight':
                keyStates.run = false;
                break;

        }

    }
);



// EVITAR TECLAS ATASCADAS AL CAMBIAR DE VENTANA


window.addEventListener(
    'blur',
    () => {

        keyStates.forward = false;
        keyStates.backward = false;
        keyStates.left = false;
        keyStates.right = false;
        keyStates.run = false;

    }
);



// CONVERTIR ANIMACIÓN A "IN PLACE"


function makeClipInPlace(
    originalClip
) {

    const clip =
        originalClip.clone();


    clip.tracks.forEach(
        (track) => {

            const trackName =
                track.name.toLowerCase();


            if (
                trackName.includes('hips.position')
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

                        /*
                        Conservamos Y porque contiene
                        movimiento vertical natural.

                        Bloqueamos X y Z porque el
                        desplazamiento real lo controlará
                        JavaScript.
                        */

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



// CARGAR PERSONAJE


export function loadPlayer(
    scene,
    spawnPosition = new THREE.Vector3(
        0,
        0,
        0
    )
) {

    return new Promise(
        (resolve, reject) => {

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


                    // -----------------------------------------------
                    // ORIENTACIÓN INICIAL
                    // -----------------------------------------------

                    player.rotation.y =
                        Math.PI;


                    // -----------------------------------------------
                    // POSICIÓN INICIAL
                    // -----------------------------------------------

                    player.position.copy(
                        spawnPosition
                    );


                    // -----------------------------------------------
                    // SOMBRAS
                    // -----------------------------------------------

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


                    // -----------------------------------------------
                    // ANIMATION MIXER
                    // -----------------------------------------------

                    mixer =
                        new THREE.AnimationMixer(
                            player
                        );


                    // -----------------------------------------------
                    // REGISTRAR ANIMACIONES
                    // -----------------------------------------------

                    gltf.animations.forEach(
                        (originalClip) => {

                            const clip =
                                makeClipInPlace(
                                    originalClip
                                );


                            const animationName =
                                clip.name.toLowerCase();


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


                            if (
                                animationName.includes(
                                    'walk'
                                )
                            ) {

                                actions.Walk =
                                    mixer.clipAction(
                                        clip
                                    );

                            }


                            if (
                                animationName.includes(
                                    'run'
                                )
                            ) {

                                actions.Run =
                                    mixer.clipAction(
                                        clip
                                    );

                            }


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

                    // -----------------------------------------------
                    // DETECTAR FIN DE ANIMACIÓN THROW
                    // -----------------------------------------------

                    mixer.addEventListener(
                        'finished',
                        (event) => {

                            if (
                                event.action ===
                                actions.Throw
                            ) {

                                actionLocked = false;

                                currentAction = null;

                            }

                        }
                    );
                    // -----------------------------------------------
                    // AGREGAR PERSONAJE
                    // -----------------------------------------------

                    scene.add(
                        player
                    );


                    // -----------------------------------------------
                    // ANIMACIÓN INICIAL
                    // -----------------------------------------------

                    playAnimation(
                        'Idle'
                    );


                    // -----------------------------------------------
                    // CONSOLA
                    // -----------------------------------------------

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
                                ) * 100
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



// CAMBIAR ANIMACIÓN


export function playAnimation(
    animationName
) {

    const nextAction =
        actions[animationName];


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


    if (
        currentAction
    ) {

        currentAction.fadeOut(
            0.18
        );

    }


    nextAction
        .reset()
        .fadeIn(
            0.18
        )
        .play();


    currentAction =
        nextAction;

}


// ANIMACIÓN DE LANZAMIENTO


export function triggerThrow() {

    if (
        !player ||
        !mixer ||
        !actions.Throw ||
        actionLocked
    ) {

        return;

    }


    actionLocked = true;


    if (
        currentAction
    ) {

        currentAction.fadeOut(
            0.12
        );

    }


    const throwAction =
        actions.Throw;


    throwAction.reset();

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

// ACTUALIZAR PERSONAJE
export function updatePlayer(
    deltaTime,
    camera
) {

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


    // Quitamos componente vertical

    cameraForward.y = 0;


    if (
        cameraForward.lengthSq() >
        0
    ) {

        cameraForward.normalize();

    }


    // ========================================================
    // VECTOR DERECHA DE LA CÁMARA
    // ========================================================

    cameraRight.crossVectors(
        cameraForward,
        worldUp
    );


    if (
        cameraRight.lengthSq() >
        0
    ) {

        cameraRight.normalize();

    }


    // ========================================================
    // CALCULAR MOVIMIENTO
    // ========================================================

    moveDirection.set(
        0,
        0,
        0
    );


    if (
        keyStates.forward
    ) {

        moveDirection.add(
            cameraForward
        );

    }


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


    const isMoving =
        moveDirection.lengthSq() > 0;


    // ========================================================
    // PERSONAJE EN MOVIMIENTO
    // ========================================================

    if (
        isMoving
    ) {

        moveDirection.normalize();


        const isRunning =
            keyStates.run;


        const speed =
            isRunning
                ? RUN_SPEED
                : WALK_SPEED;


        // -----------------------------------------------
        // DESPLAZAMIENTO
        // -----------------------------------------------

        player.position.addScaledVector(
            moveDirection,
            speed * deltaTime
        );


        // -----------------------------------------------
        // ROTACIÓN DEL PERSONAJE
        // -----------------------------------------------

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


        // Giro suave

        const rotationFactor =
            1 -
            Math.exp(
                -12 * deltaTime
            );


        player.quaternion.slerp(
            targetQuaternion,
            rotationFactor
        );


        // -----------------------------------------------
        // ANIMACIÓN
        // -----------------------------------------------

        if (
            isRunning
        ) {

            playAnimation(
                'Run'
            );

        } else {

            playAnimation(
                'Walk'
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


    return player;

}



// OBTENER PERSONAJE


export function getPlayer() {

    return player;

}