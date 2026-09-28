import * as THREE from 'three';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


// ============================================================
// VARIABLES DEL PERSONAJE
// ============================================================

let player = null;

let mixer = null;

let currentAction = null;

const actions = {};


// ============================================================
// CARGAR PERSONAJE
// ============================================================

export function loadPlayer(
    scene,
    spawnPosition = new THREE.Vector3(0, 0, 0)
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
                    // POSICIÓN INICIAL
                    // -----------------------------------------------

                    player.position.copy(
                        spawnPosition
                    );


                    // -----------------------------------------------
                    // CONFIGURACIÓN VISUAL
                    // -----------------------------------------------

                    player.traverse(
                        (object) => {

                            if (
                                object.isMesh
                            ) {

                                object.castShadow = true;

                                object.receiveShadow = true;

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
                        (clip) => {

                            const name =
                                clip.name.toLowerCase();


                            if (
                                name.includes('idle')
                            ) {

                                actions.Idle =
                                    mixer.clipAction(
                                        clip
                                    );

                            }


                            if (
                                name.includes('walk')
                            ) {

                                actions.Walk =
                                    mixer.clipAction(
                                        clip
                                    );

                            }


                            if (
                                name.includes('run')
                            ) {

                                actions.Run =
                                    mixer.clipAction(
                                        clip
                                    );

                            }


                            if (
                                name.includes('throw')
                            ) {

                                actions.Throw =
                                    mixer.clipAction(
                                        clip
                                    );

                            }

                        }
                    );


                    // -----------------------------------------------
                    // AGREGAR A LA ESCENA
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
                    // INFORMACIÓN
                    // -----------------------------------------------

                    console.log(
                        '✅ Personaje cargado correctamente'
                    );


                    console.log(
                        '🎬 Animaciones encontradas:',
                        gltf.animations.map(
                            animation =>
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


// ============================================================
// CAMBIAR ANIMACIÓN
// ============================================================

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
            0.2
        );

    }


    nextAction
        .reset()
        .fadeIn(
            0.2
        )
        .play();


    currentAction =
        nextAction;

}


// ============================================================
// ACTUALIZAR ANIMACIONES
// ============================================================

export function updatePlayer(
    deltaTime
) {

    if (
        mixer
    ) {

        mixer.update(
            deltaTime
        );

    }

}


// ============================================================
// OBTENER PERSONAJE
// ============================================================

export function getPlayer() {

    return player;

}