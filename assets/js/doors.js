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
// PUERTAS ENCONTRADAS
// ============================================================

const passageDoors = [];


// ============================================================
// CANDIDATOS PARA DEPURACIÓN
// ============================================================

const doorDebugCandidates = [];

let lastDetectedDoor = null;

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
// PREPARAR PUERTAS PARA EXPLORACIÓN
// ============================================================

export function prepareDoorsForExploration(
    environment
) {

    passageDoors.length = 0;

    doorDebugCandidates.length = 0;


    if (
        !environment
    ) {

        return;

    }


    environment.traverse(
        (object) => {

            if (
                !object.isMesh
            ) {

                return;

            }


            // =================================================
            // REGISTRAR POSIBLES PUERTAS PARA DEPURACIÓN
            // =================================================

            const objectNameLower =
                object.name.toLowerCase();


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
            // OCULTAR PUERTAS DE PASO
            // =================================================

            if (
                isPassageDoorMesh(
                    object.name
                )
            ) {

                object.userData.originalVisible =
                    object.visible;

                object.visible = false;

                passageDoors.push(
                    object
                );

                return;

            }


            // =================================================
            // OCULTAR ELEMENTOS DE SALIDA DE EMERGENCIA
            // =================================================

            if (
                object.name.includes(
                    'ExitDoorSign'
                ) ||
                object.name.includes(
                    'Button_Exit'
                )
            ) {

                object.userData.originalVisible =
                    object.visible;

                object.visible = false;

                return;

            }

        }
    );


    console.log(
        '🚪 Puertas transitables preparadas:',
        passageDoors.length
    );


    console.log(
        '🔎 Objetos relacionados con puertas:',
        doorDebugCandidates.length
    );

}


// ============================================================
// OBTENER PUERTAS
// ============================================================

export function getPassageDoors() {

    return passageDoors;

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

        if (
            lastDetectedDoor !==
            nearestDoor
        ) {

            console.log(
                '🚪 PUERTA CERCANA'
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


            lastDetectedDoor =
                nearestDoor;

        }

    }


    // ========================================================
    // NOS ALEJAMOS
    // ========================================================

    else {

        lastDetectedDoor =
            null;

    }

}