
import * as THREE from 'three';


// ============================================================
// REGISTRADOR TEMPORAL DE POSICIONES
// ============================================================
//
// CONTROLES:
//
// P = guardar la posición actual del personaje
// L = imprimir todas las posiciones guardadas
// O = eliminar la última posición
//
// Cada posición crea un marcador amarillo temporal
// para que puedas ver qué sitios ya elegiste.
// ============================================================


// Altura visual del marcador sobre el piso.
const MARKER_HEIGHT =
    0.85;


// Tamaño del marcador.
const MARKER_RADIUS =
    0.16;


// Posiciones registradas.
const savedPositions =
    [];


// Marcadores visuales.
const markers =
    [];


// Evitar instalar el listener más de una vez.
let debuggerInstalled =
    false;


// ============================================================
// CREAR MARCADOR VISUAL
// ============================================================

function createMarker(
    scene,
    position,
    index
) {

    const group =
        new THREE.Group();


    group.name =
        `CoreDebugMarker_${index + 1}`;


    // --------------------------------------------------------
    // ESFERA
    // --------------------------------------------------------

    const geometry =
        new THREE.SphereGeometry(
            MARKER_RADIUS,
            16,
            16
        );


    const material =
        new THREE.MeshBasicMaterial({

            color:
                0xffd84a,

            transparent:
                true,

            opacity:
                0.95

        });


    const sphere =
        new THREE.Mesh(
            geometry,
            material
        );


    group.add(
        sphere
    );


    // --------------------------------------------------------
    // ANILLO
    // --------------------------------------------------------

    const ringGeometry =
        new THREE.TorusGeometry(
            MARKER_RADIUS * 1.7,
            0.025,
            8,
            24
        );


    const ringMaterial =
        new THREE.MeshBasicMaterial({

            color:
                0xffffff,

            transparent:
                true,

            opacity:
                0.8

        });


    const ring =
        new THREE.Mesh(
            ringGeometry,
            ringMaterial
        );


    ring.rotation.x =
        Math.PI / 2;


    group.add(
        ring
    );


    // --------------------------------------------------------
    // POSICIÓN
    // --------------------------------------------------------

    group.position.set(

        position.x,

        position.y +
        MARKER_HEIGHT,

        position.z

    );


    scene.add(
        group
    );


    markers.push(
        group
    );


    return group;

}


// ============================================================
// ELIMINAR MARCADOR
// ============================================================

function removeMarker(
    scene,
    marker
) {

    if (
        !marker
    ) {

        return;

    }


    scene.remove(
        marker
    );


    marker.traverse(
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
                        (material) =>
                            material.dispose()
                    );

                } else {

                    object.material.dispose();

                }

            }

        }
    );

}


// ============================================================
// MOSTRAR UNA POSICIÓN
// ============================================================

function printPosition(
    position,
    index
) {

    console.log(
        `📍 PUNTO #${index + 1}`
    );


    console.log(
        `X: ${position.x.toFixed(2)}`
    );


    console.log(
        `Y: ${position.y.toFixed(2)}`
    );


    console.log(
        `Z: ${position.z.toFixed(2)}`
    );


    console.log(
        `➡️ { x: ${position.x.toFixed(2)}, y: ${position.y.toFixed(2)}, z: ${position.z.toFixed(2)} },`
    );

}


// ============================================================
// IMPRIMIR TODOS LOS PUNTOS
// ============================================================

function printAllPositions() {

    if (
        savedPositions.length === 0
    ) {

        console.log(
            '📍 Todavía no hay posiciones guardadas.'
        );


        return;

    }


    console.log(
        '============================================================'
    );


    console.log(
        `📍 POSICIONES GUARDADAS: ${savedPositions.length}`
    );


    console.log(
        '============================================================'
    );


    savedPositions.forEach(
        (
            position,
            index
        ) => {

            printPosition(
                position,
                index
            );

        }
    );


    // ========================================================
    // BLOQUE LISTO PARA COPIAR
    // ========================================================

    const lines =
        savedPositions.map(
            (
                position,
                index
            ) =>

                `    { id: ${index + 1}, x: ${position.x.toFixed(2)}, y: ${position.y.toFixed(2)}, z: ${position.z.toFixed(2)} }`

        );


    console.log(
        '============================================================'
    );


    console.log(
        '📋 BLOQUE LISTO PARA CORES.JS'
    );


    console.log(
        '============================================================'
    );


    console.log(
`const CORE_POSITIONS = [
${lines.join(',\n')}
];`
    );


    console.log(
        '============================================================'
    );

}


// ============================================================
// GUARDAR POSICIÓN ACTUAL
// ============================================================

function saveCurrentPosition(
    scene,
    player
) {

    if (
        !player
    ) {

        console.warn(
            '⚠️ El personaje todavía no está disponible.'
        );


        return;

    }


    // ========================================================
    // MÁXIMO 5 PUNTOS
    // ========================================================

    if (
        savedPositions.length >= 10
    ) {

        console.warn(
            '⚠️ Ya guardaste 5 posiciones. Presiona O para borrar la última si quieres cambiarla.'
        );


        printAllPositions();


        return;

    }


    const position =
        {

            x:
                player.position.x,

            y:
                player.position.y,

            z:
                player.position.z

        };


    savedPositions.push(
        position
    );


    createMarker(
        scene,
        position,
        savedPositions.length - 1
    );


    console.log(
        '============================================================'
    );


    console.log(
        `✅ POSICIÓN ${savedPositions.length}/5 GUARDADA`
    );


    printPosition(
        position,
        savedPositions.length - 1
    );


    console.log(
        '============================================================'
    );


    if (
        savedPositions.length === 5
    ) {

        console.log(
            '🎯 Ya elegiste los 5 lugares.'
        );


        printAllPositions();

    }

}


// ============================================================
// BORRAR ÚLTIMA POSICIÓN
// ============================================================

function undoLastPosition(
    scene
) {

    if (
        savedPositions.length === 0
    ) {

        console.log(
            '📍 No hay posiciones para borrar.'
        );


        return;

    }


    const removedPosition =
        savedPositions.pop();


    const marker =
        markers.pop();


    removeMarker(
        scene,
        marker
    );


    console.log(
        '↩️ Última posición eliminada:'
    );


    console.log(
        removedPosition
    );


    console.log(
        `📍 Quedan ${savedPositions.length}/5 posiciones guardadas.`
    );

}


// ============================================================
// INSTALAR DEBUGGER
// ============================================================

export function setupPositionDebugger(
    scene,
    getPlayer
) {

    if (
        debuggerInstalled
    ) {

        return;

    }


    if (
        !scene ||
        typeof getPlayer !==
            'function'
    ) {

        console.warn(
            '⚠️ No fue posible iniciar el registrador de posiciones.'
        );


        return;

    }


    debuggerInstalled =
        true;


    console.log(
        '🧭 Registrador de posiciones activado.'
    );


    console.log(
        'P = guardar | L = listar | O = borrar última'
    );


    window.addEventListener(
        'keydown',
        (event) => {

            // Evitar repetición automática
            // si la tecla se mantiene presionada.
            if (
                event.repeat
            ) {

                return;

            }


            const player =
                getPlayer();


            switch (
                event.code
            ) {

                // --------------------------------------------
                // GUARDAR
                // --------------------------------------------

                case 'KeyP':

                    saveCurrentPosition(
                        scene,
                        player
                    );

                    break;


                // --------------------------------------------
                // LISTAR
                // --------------------------------------------

                case 'KeyL':

                    printAllPositions();

                    break;


                // --------------------------------------------
                // DESHACER
                // --------------------------------------------

                case 'KeyO':

                    undoLastPosition(
                        scene
                    );

                    break;

            }

        }
    );

}


// ============================================================
// GETTER OPCIONAL
// ============================================================

export function getSavedDebugPositions() {

    return savedPositions.map(
        (position) => ({
            ...position
        })
    );

}
