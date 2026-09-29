import * as THREE from 'three';


// ============================================================
// PUERTAS DEL ESCENARIO
// ============================================================


const passageDoorPatterns = [

    // --------------------------------------------------------
    // COCINA - PUERTAS DOBLES
    // --------------------------------------------------------

    /^DoorDouble_Kitchen_Left(?:_\d+)?_P2_/,

    /^DoorDouble_Kitchen_Right(?:_\d+)?_P2_/,

    /^Kitchen_DoorL_Glass(?:_\d+)?_P2_/,

    /^Kitchen_DoorR_Glass(?:_\d+)?_P2_/,


    // --------------------------------------------------------
    // PORTÓN DE MADERA DE COCINA
    // --------------------------------------------------------

    /^Kitchen_GateWood_P2_/,


    // --------------------------------------------------------
    // LOADING ZONE
    // --------------------------------------------------------

    /^LoadingZone_Door(?:_\d+)?_P2_/,


    // --------------------------------------------------------
    // PORTÓN GRANDE
    // --------------------------------------------------------

    /^P2_GateBig_Door_P2_/,


    // --------------------------------------------------------
    // LABORATORIO
    // --------------------------------------------------------

    /^Laboratory_Gate(?:_\d+)?_IS7_/,

    /^Laboratory_Door_Metal_Single(?:_\d+)?_IS7_/,


    // --------------------------------------------------------
    // ROBOT AREA
    // --------------------------------------------------------

    /^RobotArea_Door(?:_\d+)?_IS7_/,

    /^RobotArea_DoorGlass(?:_\d+)?_IS7_/,

    /^RobotArea_SmallDoor_IS7_/,


    // --------------------------------------------------------
    // PUERTAS INDUSTRIALES DOBLES
    // --------------------------------------------------------

    /^IndustrialDoubleDoor_[LR]_Garage_/,

    /^IndustrialDoubleDoor_[LR]_Glass_Garage_/,


    // --------------------------------------------------------
    // ELEVADOR
    // --------------------------------------------------------

    /^Elevator_Door_[LR]_P2_/,

    /^ElevatorDoor(?:_\d+)?_P2_LoadingZone_Mobile_0$/

];


// ============================================================
// PIEZAS ADICIONALES DE LAS PUERTAS TRANSITABLES
// ============================================================
//
// Algunas puertas están divididas en varias mallas.
//
// Ejemplo:
//
// Laboratory_Gate
// Laboratory_Gate_Frame_Window
// Laboratory_Gate_Frame_Window_Glass
//
// Si quitamos solamente la puerta, la ventana puede seguir
// teniendo colisión.
//
// ============================================================

const passageDoorAccessoryPatterns = [

    // --------------------------------------------------------
    // VENTANAS DEL PORTÓN DEL LABORATORIO
    // --------------------------------------------------------

    /^Laboratory_Gate_Frame_Window/,

    /^Laboratory_Gate_Frame_Window_Glass/,


    // --------------------------------------------------------
    // VIDRIOS DE LAS PUERTAS INDUSTRIALES
    // --------------------------------------------------------

    /^IndustrialDoubleDoor_[LR]_Glass_Garage_/,


    // --------------------------------------------------------
    // VIDRIOS DE LAS PUERTAS DE COCINA
    // --------------------------------------------------------

    /^Kitchen_DoorL_Glass/,

    /^Kitchen_DoorR_Glass/

];


// ============================================================
// PUERTAS ENCONTRADAS
// ============================================================

const passageDoors = [];


// ============================================================
// PIEZAS DE PUERTAS OCULTADAS
// ============================================================

const passageDoorAccessories = [];


// ============================================================
// CANDIDATOS PARA DEPURACIÓN
// ============================================================

const doorDebugCandidates = [];

let lastDetectedDoor = null;


// ============================================================
// VECTOR TEMPORAL
// ============================================================

const doorWorldPosition =
    new THREE.Vector3();


// ============================================================
// COMPROBAR SI UNA MALLA ES UNA PUERTA TRANSITABLE
// ============================================================

export function isPassageDoorMesh(
    objectName = ''
) {

    return passageDoorPatterns.some(
        (pattern) =>
            pattern.test(
                objectName
            )
    );

}


// ============================================================
// COMPROBAR SI ES UNA PIEZA DE UNA PUERTA TRANSITABLE
// ============================================================

export function isPassageDoorAccessory(
    objectName = ''
) {

    return passageDoorAccessoryPatterns.some(
        (pattern) =>
            pattern.test(
                objectName
            )
    );

}


// ============================================================
// GUARDAR VISIBILIDAD ORIGINAL
// ============================================================

function saveOriginalVisibility(
    object
) {

    if (
        object.userData.originalVisible === undefined
    ) {

        object.userData.originalVisible =
            object.visible;

    }

}


// ============================================================
// OCULTAR OBJETO
// ============================================================

function hideObject(
    object
) {

    saveOriginalVisibility(
        object
    );


    object.visible =
        false;

}


// ============================================================
// PREPARAR PUERTAS PARA EXPLORACIÓN
// ============================================================

export function prepareDoorsForExploration(
    environment
) {

    passageDoors.length = 0;

    passageDoorAccessories.length = 0;

    doorDebugCandidates.length = 0;

    lastDetectedDoor = null;


    if (
        !environment
    ) {

        console.warn(
            '⚠️ No se recibió el escenario para preparar las puertas.'
        );

        return;

    }


    environment.traverse(
        (object) => {

            // ------------------------------------------------
            // SOLAMENTE NOS INTERESAN MALLAS
            // ------------------------------------------------

            if (
                !object.isMesh
            ) {

                return;

            }


            const objectName =
                object.name || '';


            const objectNameLower =
                objectName.toLowerCase();


            // =================================================
            // REGISTRAR POSIBLES PUERTAS PARA DEPURACIÓN
            // =================================================

            if (
                objectNameLower.includes('door') ||
                objectNameLower.includes('gate') ||
                objectNameLower.includes('shutter') ||
                objectNameLower.includes('exit')
            ) {

                doorDebugCandidates.push(
                    object
                );

            }


            // =================================================
            // OCULTAR PIEZAS ADICIONALES DE PUERTAS
            // =================================================
            //
            // Aquí entran, por ejemplo, los vidrios circulares
            // que seguían bloqueando al personaje.
            //
            // =================================================

            if (
                isPassageDoorAccessory(
                    objectName
                )
            ) {

                hideObject(
                    object
                );


                passageDoorAccessories.push(
                    object
                );


                console.log(
                    '🪟 Pieza de puerta eliminada:',
                    objectName
                );


                return;

            }


            // =================================================
            // OCULTAR PUERTAS DE PASO
            // =================================================

            if (
                isPassageDoorMesh(
                    objectName
                )
            ) {

                hideObject(
                    object
                );


                passageDoors.push(
                    object
                );


                console.log(
                    '🚪 Puerta abierta para exploración:',
                    objectName
                );


                return;

            }


            // =================================================
            // OCULTAR ELEMENTOS DE SALIDA DE EMERGENCIA
            // =================================================
            //
            // Algunos letreros/botones están construidos como
            // mallas y Rapier puede considerarlos obstáculos.
            //
            // =================================================

            if (
                objectName.includes(
                    'ExitDoorSign'
                ) ||
                objectName.includes(
                    'Button_Exit'
                )
            ) {

                hideObject(
                    object
                );


                passageDoorAccessories.push(
                    object
                );


                console.log(
                    '🟢 Elemento de salida eliminado:',
                    objectName
                );


                return;

            }

        }
    );


    // ========================================================
    // RESUMEN
    // ========================================================

    console.log(
        '=============================================='
    );

    console.log(
        '🚪 PUERTAS DEL ESCENARIO'
    );


    console.log(
        '🚪 Puertas transitables ocultadas:',
        passageDoors.length
    );


    console.log(
        '🪟 Accesorios de puertas ocultados:',
        passageDoorAccessories.length
    );


    console.log(
        '🔎 Objetos relacionados con puertas:',
        doorDebugCandidates.length
    );


    console.log(
        '=============================================='
    );

}


// ============================================================
// OBTENER PUERTAS
// ============================================================

export function getPassageDoors() {

    return passageDoors;

}


// ============================================================
// OBTENER ACCESORIOS
// ============================================================

export function getPassageDoorAccessories() {

    return passageDoorAccessories;

}


// ============================================================
// RESTAURAR PUERTAS
// ============================================================

export function restorePassageDoors() {

    passageDoors.forEach(
        (door) => {

            door.visible =
                door.userData.originalVisible ??
                true;

        }
    );


    passageDoorAccessories.forEach(
        (accessory) => {

            accessory.visible =
                accessory.userData.originalVisible ??
                true;

        }
    );


    console.log(
        '🔄 Puertas y accesorios restaurados.'
    );

}


// ============================================================
// MOSTRAR PUERTA MÁS CERCANA EN CONSOLA
// ============================================================

export function debugNearestDoor(
    player,
    maxDistance = 3
) {

    if (
        !player ||
        doorDebugCandidates.length === 0
    ) {

        return;

    }


    let nearestDoor = null;

    let nearestDistance =
        Infinity;


    // ========================================================
    // BUSCAR OBJETO RELACIONADO CON PUERTA MÁS CERCANO
    // ========================================================

    doorDebugCandidates.forEach(
        (door) => {

            door.getWorldPosition(
                doorWorldPosition
            );


            const distance =
                player.position.distanceTo(
                    doorWorldPosition
                );


            if (
                distance <
                nearestDistance
            ) {

                nearestDistance =
                    distance;

                nearestDoor =
                    door;

            }

        }
    );


    // ========================================================
    // ESTAMOS CERCA DE UNA PUERTA
    // ========================================================

    if (
        nearestDoor &&
        nearestDistance <= maxDistance
    ) {

        // ----------------------------------------------------
        // EVITAR IMPRIMIR LO MISMO 60 VECES POR SEGUNDO
        // ----------------------------------------------------

        if (
            lastDetectedDoor !==
            nearestDoor
        ) {

            console.log(
                '=============================================='
            );

            console.log(
                '🚪 PUERTA / ELEMENTO CERCANO'
            );


            console.log(
                'Nombre:',
                nearestDoor.name
            );


            console.log(
                'Distancia:',
                `${nearestDistance.toFixed(2)} m`
            );


            console.log(
                'Visible:',
                nearestDoor.visible
            );


            console.log(
                'Posición:',
                {
                    x:
                        Number(
                            doorWorldPosition.x.toFixed(2)
                        ),

                    y:
                        Number(
                            doorWorldPosition.y.toFixed(2)
                        ),

                    z:
                        Number(
                            doorWorldPosition.z.toFixed(2)
                        )
                }
            );


            console.log(
                '¿Es puerta transitable?:',
                isPassageDoorMesh(
                    nearestDoor.name
                )
            );


            console.log(
                '¿Es accesorio de puerta?:',
                isPassageDoorAccessory(
                    nearestDoor.name
                )
            );


            console.log(
                '=============================================='
            );


            lastDetectedDoor =
                nearestDoor;

        }

    }


    // ========================================================
    // NOS ALEJAMOS DE LA PUERTA
    // ========================================================

    else {

        lastDetectedDoor =
            null;

    }

}