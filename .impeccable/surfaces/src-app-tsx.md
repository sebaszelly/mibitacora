---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Hoy (y el resto de la app, que hereda este mundo)

Modo: Operate. Usuario único, iPhone 17 con iOS 26, una mano, ráfagas de segundos a lo largo del día. Tarea: registrar en uno o dos toques y leer el estado del día de un vistazo.

## Direction contract

THESIS: El día se lee como una hoja de almanaque: la fecha manda, cada hábito es una fila reglada con su cifra y el estado de cada día es una fase (lleno, medio, vacío). Rechaza la rejilla de tarjetas con emojis en círculos y anillos de progreso de los trackers de hábitos.

OWN-WORLD: Papel casi blanco neutro, tinta casi negra, un solo azul de imprenta para la fecha, el día seleccionado, las barras y las acciones. Archivo en dos voces: cifras condensadas y pesadas (ancho 62–68 %), texto en ancho normal. Reglas: 2 px de tinta para abrir sección, 1 px gris entre filas. Esquinas casi rectas (4–6 px). Sin tarjetas ni sombras. Oscuro: negro cálido, azul aclarado.

STORY: Abre, ve la fecha y cuánto lleva del día, toca +500 y la cifra cambia al instante; cierra.

FIRST VIEWPORT: Arriba a la izquierda el número del día a 92 px en azul; al lado, día de la semana y "mes año · semana N"; a la derecha el % del día en cifra condensada. Debajo, la fila de la semana en siete celdas regladas con letra, número y fase; el día elegido en bloque azul. Luego las filas: sección "Hoy" con agua (cifra, barra de 6 px y botones rápidos al alcance del pulgar) y Anki; "Esta semana" con puntos de fase; "Registrar" con eventos. Barra de cinco pestañas abajo con regla de 2 px.

FORM: Almanaque de pared, primero de la lista propia ordenada; elegido por el usuario entre tres. seed: none (pinned) — «elijo la 2, almanaque».

SIGNATURE: Las fases como lenguaje de estado en toda la app (fila de semana, calendario mensual, reportes), siempre forma más color. Movimiento: respuesta de presión de 130 ms y barra que avanza en 260 ms; la única celebración es el llenado de la fase del día al completar la meta.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
