
# Instituto Tecnológico de Pachuca

## Ingeniería en tecnologías de la Información y Comunicaciones

### Desarrollo de Soluciones en Ambientes virtuales

Profesor: **Víctor Manuel Pinedo Fernández**

Autor: **Alicia Yamileth Mariano Reséndiz**

Fecha: **29/09/2026**

# OPERACIÓN: REACTOR

Videojuego Web 3D desarrollado con Three.js y Rapier 3D.

## 🎮 Objetivo

El jugador debe explorar una instalación y destruir **5 núcleos de energía** antes de que terminen los **3 minutos**.

En cada partida se seleccionan aleatoriamente 5 núcleos entre diferentes posiciones disponibles dentro del escenario.

Si los 5 núcleos son destruidos, la misión se completa.

Si el tiempo llega a 0:00, el reactor entra en fallo crítico y se activa una explosión que termina la partida.

---

## 🕹️ Controles

- **W A S D:** Mover personaje
- **Shift:** Correr
- **Mouse:** Controlar cámara
- **Click:** Lanzar proyectil
- **E:** Interactuar con puertas y escaleras
- **Potencia:** Permite modificar la fuerza del proyectil entre 50% y 200%

---

## ⚙️ Mecánicas principales

- Personaje en tercera persona.
- Animaciones Idle, Walk, Run y Throw.
- Cámara con seguimiento y control mediante mouse.
- Proyectiles físicos dirigidos hacia la mira.
- Núcleos de energía generados aleatoriamente.
- Objetos físicos que reaccionan a los impactos.
- Estructura de cajas derribable.
- Puertas y escaleras interactivas.
- Sistema de victoria y derrota.
- Temporizador de 3 minutos.
- Música ambiental y sonido de explosión.
- Reinicio de partida.

---

## 🧱 Física

El videojuego utiliza **Rapier 3D** para manejar:

- gravedad;
- colliders;
- cuerpos rígidos;
- colisiones del personaje;
- proyectiles;
- objetos dinámicos;
- impactos y estructura derribable.

El escenario utiliza colliders estáticos mientras que los proyectiles y objetos interactivos utilizan cuerpos rígidos dinámicos.

---

## 🛠️ Tecnologías

- HTML5
- CSS3
- JavaScript
- Three.js
- GLTFLoader
- AnimationMixer
- OrbitControls
- Rapier 3D
- Modelos GLB
- Git y GitHub
- GitHub Pages
