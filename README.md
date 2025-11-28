# Guerras de Carriles (Lane Wars)

Un prototipo de RTS minimalista desarrollado con HTML5 Canvas y JavaScript.

## Descripción
"Guerras de Carriles" es un juego de estrategia en tiempo real donde comandas un ejército de unidades geométricas para destruir la base enemiga. Gestiona tus recursos, captura fuertes neutrales y construye defensas para asegurar la victoria.

## Cómo Ejecutar
1.  Abre el archivo `index.html` en un navegador web moderno.
    *   Nota: Debido a las políticas de seguridad de los navegadores (CORS) con módulos ES6, es posible que necesites ejecutar un servidor local.
    *   Si tienes Python instalado, puedes ejecutar: `python -m http.server` en la carpeta del proyecto y abrir `http://localhost:8000`.

## Controles
*   **Selección Simple**: Clic Izquierdo sobre una unidad.
*   **Selección de Área**: Arrastra con Clic Izquierdo para seleccionar múltiples unidades.
*   **Selección de Grupo**: Doble Clic Izquierdo sobre una unidad para seleccionar todas las unidades visibles de ese tipo.
*   **Mover/Atacar**: Clic Derecho en el mapa.
*   **Construir**: Clic Izquierdo en los espacios vacíos (+) alrededor de tu Cuartel (Base Azul).

## Mecánicas
*   **Recursos**: El Oro se genera pasivamente al controlar Fuertes neutrales.
*   **Unidades**: Los soldados se generan automáticamente cada 3 segundos en el Cuartel.
*   **Combate**: Las unidades atacan automáticamente a los enemigos en rango.
*   **Construcción**:
    *   **Torre (50g)**: Defensa estática.
    *   **Granja (100g)**: Genera oro extra (implementado como slot de oro).
    *   **Casa (75g)**: Reduce el tiempo de generación de soldados en 0.1s.

## Estructura del Proyecto
*   `index.html`: Punto de entrada.
*   `src/`: Código fuente JavaScript.
    *   `main.js`: Inicialización.
    *   `game.js`: Lógica principal y bucle de juego.
    *   `entities.js`: Clases para Unidades, Edificios y Fuertes.
    *   `input.js`: Manejo de mouse y selección.
    *   `renderer.js`: Renderizado en Canvas.
    *   `ai.js`: Lógica de la IA enemiga.
