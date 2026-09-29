import * as THREE from 'three';


// ============================================================
// PUERTAS INTERACTIVAS MULTIMALLA - OPERACIÓN: REACTOR
// ============================================================
//
// COMPORTAMIENTO:
//
// 1. Antes de crear el collider estático, se retiran
//    temporalmente:
//      - las puertas transitables,
//      - vidrios/ventanas relacionados,
//      - letreros/botones de salida que puedan bloquear.
//
// 2. Se crea el collider del escenario SIN esas piezas.
//
// 3. Se restauran visualmente.
//
// 4. Al acercarse desde CUALQUIERA de los dos lados aparece:
//
//      [E] Abrir puerta
//
// 5. Al presionar E se elimina la puerta completa:
//      - hoja principal,
//      - segunda hoja cercana,
//      - vidrio,
//      - ventana,
//      - accesorios cercanos.
//
// 6. Nada de esa puerta vuelve a aparecer durante la partida.
// ============================================================


// ============================================================
// PUERTAS TRANSITABLES - LISTADO QUE YA TENÍAMOS
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
// PIEZAS ADICIONALES / ACCESORIOS
// ============================================================
//
// Esta es la parte importante que evita que quede:
//
// - una ventana invisible,
// - un vidrio,
// - un letrero,
// - un botón,
// - otra pieza del marco
//
// bloqueando el paso después de quitar la puerta.
// ============================================================

const passageDoorAccessoryPatterns = [

    // --------------------------------------------------------
    // VENTANAS DEL PORTÓN DEL LABORATORIO
    // --------------------------------------------------------

    /^Laboratory_Gate_Frame_Window/,

    /^Laboratory_Gate_Frame_Window_Glass/,


    // --------------------------------------------------------
    // VIDRIOS DE PUERTAS INDUSTRIALES
    // --------------------------------------------------------

    /^IndustrialDoubleDoor_[LR]_Glass_Garage_/,


    // --------------------------------------------------------
    // VIDRIOS DE PUERTAS DE COCINA
    // --------------------------------------------------------

    /^Kitchen_DoorL_Glass/,

    /^Kitchen_DoorR_Glass/,


    // --------------------------------------------------------
    // LETREROS / BOTONES DE SALIDA
    // --------------------------------------------------------

    /ExitDoorSign/,

    /Button_Exit/

];


// ============================================================
// CONFIGURACIÓN DE INTERACCIÓN
// ============================================================

// Expansión simétrica alrededor de la puerta.
// Por eso funciona desde ambos lados.
const DOOR_TRIGGER_HORIZONTAL =
    2.65;

const DOOR_TRIGGER_VERTICAL =
    1.35;


// Margen para considerar que otra malla forma
// parte de la misma puerta.
const ASSEMBLY_HORIZONTAL_MARGIN =
    1.55;

const ASSEMBLY_VERTICAL_MARGIN =
    2.00;


// Respaldo por distancia entre centros.
const ASSEMBLY_CENTER_DISTANCE =
    3.00;


// Evitar dobles pulsaciones.
const DOOR_INTERACTION_COOLDOWN =
    350;


// ============================================================
// ESTADO
// ============================================================

const passageDoors =
    [];


const passageDoorAccessories =
    [];


let configuredPlayer =
    null;


let currentDoor =
    null;


let promptElement =
    null;


let listenerInstalled =
    false;


let interactionLocked =
    false;


// ============================================================
// VECTORES / CAJAS TEMPORALES
// ============================================================

const tempBox =
    new THREE.Box3();


const targetBox =
    new THREE.Box3();


const candidateBox =
    new THREE.Box3();


const interactionBox =
    new THREE.Box3();


const targetCenter =
    new THREE.Vector3();


const candidateCenter =
    new THREE.Vector3();


const playerPoint =
    new THREE.Vector3();


const triggerExpansion =
    new THREE.Vector3(

        DOOR_TRIGGER_HORIZONTAL,

        DOOR_TRIGGER_VERTICAL,

        DOOR_TRIGGER_HORIZONTAL

    );


const assemblyExpansion =
    new THREE.Vector3(

        ASSEMBLY_HORIZONTAL_MARGIN,

        ASSEMBLY_VERTICAL_MARGIN,

        ASSEMBLY_HORIZONTAL_MARGIN

    );


// ============================================================
// MATCHERS
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
// CREAR REGISTRO DE OBJETO
// ============================================================

function createRecord(
    object
) {

    const parent =
        object.parent;


    if (
        !parent
    ) {

        return null;

    }


    return {

        object,

        parent,

        childIndex:
            parent.children.indexOf(
                object
            ),

        detachedForCollider:
            true,

        removed:
            false

    };

}


// ============================================================
// PREPARAR PUERTAS ANTES DEL COLLIDER
// ============================================================

export function prepareDoorsForExploration(
    environment
) {

    passageDoors.length =
        0;


    passageDoorAccessories.length =
        0;


    currentDoor =
        null;


    if (
        !environment
    ) {

        console.warn(
            '⚠️ No se recibió el escenario para preparar las puertas.'
        );


        return;

    }


    const doorObjects =
        [];


    const accessoryObjects =
        [];


    environment.traverse(
        (object) => {

            if (
                !object.isMesh
            ) {

                return;

            }


            const objectName =
                object.name ||
                '';


            const isDoor =
                isPassageDoorMesh(
                    objectName
                );


            const isAccessory =
                isPassageDoorAccessory(
                    objectName
                );


            // ------------------------------------------------
            // REGISTRAR COMO PUERTA
            // ------------------------------------------------
            //
            // Aunque algunos vidrios también coincidan con
            // accesorios, conservamos el patrón de puerta
            // para que puedan actuar como parte principal.
            // ------------------------------------------------

            if (
                isDoor
            ) {

                doorObjects.push(
                    object
                );


                return;

            }


            // ------------------------------------------------
            // ACCESORIO INDEPENDIENTE
            // ------------------------------------------------

            if (
                isAccessory
            ) {

                accessoryObjects.push(
                    object
                );

            }

        }
    );


    // ========================================================
    // CREAR REGISTROS
    // ========================================================

    for (
        const object of doorObjects
    ) {

        const record =
            createRecord(
                object
            );


        if (
            record
        ) {

            passageDoors.push(
                record
            );

        }

    }


    for (
        const object of accessoryObjects
    ) {

        const record =
            createRecord(
                object
            );


        if (
            record
        ) {

            passageDoorAccessories.push(
                record
            );

        }

    }


    // ========================================================
    // RETIRAR TEMPORALMENTE ANTES DEL COLLIDER
    // ========================================================

    for (
        const door of passageDoors
    ) {

        door.parent.remove(
            door.object
        );

    }


    for (
        const accessory of passageDoorAccessories
    ) {

        if (
            accessory.object.parent
        ) {

            accessory.object.parent.remove(
                accessory.object
            );

        }

    }


    console.log(
        '=============================================='
    );


    console.log(
        '🚪 PUERTAS INTERACTIVAS MULTIMALLA'
    );


    console.log(
        '🚪 Puertas retiradas antes del collider:',
        passageDoors.length
    );


    console.log(
        '🪟 Accesorios retirados antes del collider:',
        passageDoorAccessories.length
    );


    console.log(
        '=============================================='
    );

}


// ============================================================
// RESTAURAR UN REGISTRO
// ============================================================

function restoreRecord(
    record
) {

    if (
        !record ||
        record.removed ||
        !record.detachedForCollider
    ) {

        return;

    }


    const {

        parent,

        object,

        childIndex

    } =
        record;


    parent.add(
        object
    );


    // Intentar conservar orden original.
    const currentIndex =
        parent.children.indexOf(
            object
        );


    if (
        currentIndex >= 0 &&
        childIndex >= 0 &&
        childIndex <
            parent.children.length
    ) {

        parent.children.splice(
            currentIndex,
            1
        );


        parent.children.splice(

            Math.min(
                childIndex,
                parent.children.length
            ),

            0,

            object

        );

    }


    object.visible =
        true;


    object.updateMatrixWorld(
        true
    );


    record.detachedForCollider =
        false;

}


// ============================================================
// RESTAURAR DESPUÉS DEL COLLIDER
// ============================================================

export function restoreDoorsAfterCollider() {

    for (
        const door of passageDoors
    ) {

        restoreRecord(
            door
        );

    }


    for (
        const accessory of passageDoorAccessories
    ) {

        restoreRecord(
            accessory
        );

    }


    console.log(
        '🚪 Puertas y accesorios restaurados visualmente.'
    );

}


// ============================================================
// PROMPT
// ============================================================

function ensurePrompt() {

    if (
        promptElement
    ) {

        return promptElement;

    }


    promptElement =
        document.getElementById(
            'door-interaction-prompt'
        );


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
        'door-interaction-prompt';


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
                '2200',

            padding:
                '10px 16px',

            border:
                '1px solid rgba(255,255,255,0.45)',

            borderRadius:
                '7px',

            background:
                'rgba(8, 11, 14, 0.88)',

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
                '0 6px 24px rgba(0,0,0,0.30)',

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


function showPrompt() {

    const prompt =
        ensurePrompt();


    prompt.textContent =
        '[E] Abrir puerta';


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
// BOX DE UN OBJETO
// ============================================================

function getRecordBox(
    record,
    destinationBox
) {

    destinationBox.makeEmpty();


    if (
        !record ||
        record.removed ||
        record.detachedForCollider ||
        !record.object ||
        !record.object.parent
    ) {

        return destinationBox;

    }


    record.object.updateWorldMatrix(
        true,
        true
    );


    destinationBox.setFromObject(
        record.object
    );


    return destinationBox;

}


// ============================================================
// CENTRO DE UN REGISTRO
// ============================================================

function getRecordCenter(
    record,
    destination
) {

    getRecordBox(
        record,
        tempBox
    );


    if (
        tempBox.isEmpty()
    ) {

        if (
            record.object
        ) {

            record.object.getWorldPosition(
                destination
            );

        }


        return destination;

    }


    tempBox.getCenter(
        destination
    );


    return destination;

}


// ============================================================
// DETECCIÓN DESDE AMBOS LADOS
// ============================================================
//
// No existe "frente" o "atrás".
//
// La caja de la puerta se expande en:
//
// +X  -X
// +Z  -Z
//
// así que el jugador activa el prompt desde ambos lados.
// ============================================================

function isPlayerInsideDoorTrigger(
    player,
    door
) {

    if (
        !player ||
        !door ||
        door.removed ||
        door.detachedForCollider
    ) {

        return false;

    }


    getRecordBox(
        door,
        interactionBox
    );


    if (
        interactionBox.isEmpty()
    ) {

        return false;

    }


    interactionBox.expandByVector(
        triggerExpansion
    );


    playerPoint.copy(
        player.position
    );


    playerPoint.y +=
        0.80;


    return interactionBox.containsPoint(
        playerPoint
    );

}


// ============================================================
// BUSCAR PUERTA MÁS CERCANA
// ============================================================

function findNearestDoor(
    player
) {

    let nearest =
        null;


    let nearestDistanceSquared =
        Infinity;


    for (
        const door of passageDoors
    ) {

        if (
            !isPlayerInsideDoorTrigger(
                player,
                door
            )
        ) {

            continue;

        }


        getRecordCenter(
            door,
            candidateCenter
        );


        const distanceSquared =
            candidateCenter.distanceToSquared(
                player.position
            );


        if (
            distanceSquared <
            nearestDistanceSquared
        ) {

            nearestDistanceSquared =
                distanceSquared;


            nearest =
                door;

        }

    }


    return nearest;

}


// ============================================================
// ¿FORMA PARTE DEL MISMO CONJUNTO DE PUERTA?
// ============================================================

function belongsToDoorAssembly(
    targetDoor,
    candidateRecord
) {

    if (
        !targetDoor ||
        !candidateRecord ||
        targetDoor ===
            candidateRecord ||
        candidateRecord.removed ||
        candidateRecord.detachedForCollider
    ) {

        return false;

    }


    getRecordBox(
        targetDoor,
        targetBox
    );


    getRecordBox(
        candidateRecord,
        candidateBox
    );


    if (
        targetBox.isEmpty() ||
        candidateBox.isEmpty()
    ) {

        return false;

    }


    const expandedTargetBox =
        targetBox.clone();


    expandedTargetBox.expandByVector(
        assemblyExpansion
    );


    // Caso principal:
    // las cajas se encuentran dentro del mismo conjunto.
    if (
        expandedTargetBox.intersectsBox(
            candidateBox
        )
    ) {

        return true;

    }


    // Respaldo:
    // comparar centros.
    targetBox.getCenter(
        targetCenter
    );


    candidateBox.getCenter(
        candidateCenter
    );


    return targetCenter.distanceTo(
        candidateCenter
    ) <=
        ASSEMBLY_CENTER_DISTANCE;

}


// ============================================================
// RETIRAR UNA PIEZA PERMANENTEMENTE
// ============================================================

function removeRecordPermanently(
    record
) {

    if (
        !record ||
        record.removed
    ) {

        return;

    }


    if (
        record.object &&
        record.object.parent
    ) {

        record.object.parent.remove(
            record.object
        );

    }


    record.removed =
        true;

}


// ============================================================
// ABRIR PUERTA COMPLETA
// ============================================================

function openDoorAssembly(
    targetDoor
) {

    if (
        !targetDoor ||
        targetDoor.removed
    ) {

        return;

    }


    const removedNames =
        [];


    // ========================================================
    // GUARDAR LA BOX ANTES DE QUITAR EL OBJETO
    // ========================================================

    getRecordBox(
        targetDoor,
        targetBox
    );


    const targetBoxSnapshot =
        targetBox.clone();


    targetBoxSnapshot.expandByVector(
        assemblyExpansion
    );


    targetBox.getCenter(
        targetCenter
    );


    const targetCenterSnapshot =
        targetCenter.clone();


    // ========================================================
    // FUNCIÓN LOCAL PARA COMPROBAR CONTRA SNAPSHOT
    // ========================================================

    function shouldRemoveWithTarget(
        record
    ) {

        if (
            !record ||
            record.removed ||
            record.detachedForCollider
        ) {

            return false;

        }


        getRecordBox(
            record,
            candidateBox
        );


        if (
            candidateBox.isEmpty()
        ) {

            return false;

        }


        if (
            targetBoxSnapshot.intersectsBox(
                candidateBox
            )
        ) {

            return true;

        }


        candidateBox.getCenter(
            candidateCenter
        );


        return targetCenterSnapshot
            .distanceTo(
                candidateCenter
            ) <=
            ASSEMBLY_CENTER_DISTANCE;

    }


    // ========================================================
    // RETIRAR HOJA PRINCIPAL
    // ========================================================

    removedNames.push(
        targetDoor.object.name
    );


    removeRecordPermanently(
        targetDoor
    );


    // ========================================================
    // RETIRAR OTRAS HOJAS / PUERTAS DEL MISMO CONJUNTO
    // ========================================================

    for (
        const door of passageDoors
    ) {

        if (
            door ===
                targetDoor ||
            door.removed
        ) {

            continue;

        }


        if (
            shouldRemoveWithTarget(
                door
            )
        ) {

            removedNames.push(
                door.object.name
            );


            removeRecordPermanently(
                door
            );

        }

    }


    // ========================================================
    // RETIRAR VENTANAS / VIDRIOS / LETREROS / BOTONES
    // ========================================================

    for (
        const accessory of
        passageDoorAccessories
    ) {

        if (
            accessory.removed
        ) {

            continue;

        }


        if (
            shouldRemoveWithTarget(
                accessory
            )
        ) {

            removedNames.push(
                accessory.object.name
            );


            removeRecordPermanently(
                accessory
            );

        }

    }


    currentDoor =
        null;


    hidePrompt();


    console.log(
        '=============================================='
    );


    console.log(
        '🚪 PUERTA COMPLETA RETIRADA'
    );


    console.log(
        removedNames
    );


    console.log(
        '=============================================='
    );


    interactionLocked =
        true;


    window.setTimeout(
        () => {

            interactionLocked =
                false;

        },
        DOOR_INTERACTION_COOLDOWN
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
                interactionLocked ||
                !currentDoor
            ) {

                return;

            }


            openDoorAssembly(
                currentDoor
            );

        }
    );

}


// ============================================================
// CONFIGURAR
// ============================================================

export function setupDoorInteractions(
    player
) {

    configuredPlayer =
        player;


    ensurePrompt();


    installInteractionListener();


    console.log(
        '🚪 Interacción de puertas multimalla activada.'
    );


    console.log(
        '🚪 Funciona desde ambos lados.'
    );

}


// ============================================================
// UPDATE
// ============================================================

export function updateDoorInteractions(
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
        interactionLocked
    ) {

        currentDoor =
            null;


        hidePrompt();


        return;

    }


    currentDoor =
        findNearestDoor(
            configuredPlayer
        );


    if (
        currentDoor
    ) {

        showPrompt();

    } else {

        hidePrompt();

    }

}


// ============================================================
// GETTERS
// ============================================================

export function getPassageDoors() {

    return passageDoors;

}


export function getPassageDoorAccessories() {

    return passageDoorAccessories;

}


export function getRemainingDoorCount() {

    return passageDoors.filter(
        (door) =>
            !door.removed
    ).length;

}
