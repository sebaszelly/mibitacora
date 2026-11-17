---
name: Mi Bitácora
description: Registro personal de hábitos con la forma de una hoja de almanaque.
colors:
  bg: "#f6f6f2"
  surface: "#ffffff"
  ink: "#101216"
  muted: "#555b66"
  rule: "#d4d5ce"
  track: "#dcddd6"
  accent: "#1e3ec8"
  accent-ink: "#ffffff"
  accent-soft: "#e4e8f8"
  ok: "#1f7a4a"
  warn: "#a8650a"
  bad: "#b23a2b"
  dark-bg: "#131110"
  dark-surface: "#1d1a18"
  dark-ink: "#f0ede7"
  dark-muted: "#a8a297"
  dark-rule: "#35312d"
  dark-accent: "#93a6ff"
  dark-accent-ink: "#0b1238"
  dark-ok: "#5cc98f"
  dark-warn: "#e0a545"
  dark-bad: "#ee7a68"
typography:
  day:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "5.75rem"
    fontWeight: 800
    lineHeight: 0.8
    letterSpacing: "-0.02em"
  figure:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.2
  title:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 800
    lineHeight: 1
  body:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 800
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "6px"
  sheet: "14px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "20px"
  s6: "24px"
  gutter: "18px"
components:
  button:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "46px"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.sm}"
    height: "46px"
  row:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    height: "52px"
  day-cell-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    rounded: "{rounded.md}"
    height: "50px"
---

# Mi Bitácora — sistema de diseño

La fuente de verdad son los tokens de `src/styles/tokens.css`. Este documento explica cómo usarlos. Dirección elegida por Sebas el 17 nov 2026: **Almanaque**.

## Overview

El día se lee como una hoja de almanaque de pared: la fecha manda, cada hábito es una fila reglada con su cifra, y el estado de cada día es una fase (lleno, medio, vacío). Es una herramienta que se abre unos segundos varias veces al día con una mano, así que gana la densidad y la respuesta inmediata sobre cualquier adorno.

No es una rejilla de tarjetas con emojis en círculos y anillos de progreso.

## Colors

- **Papel y tinta.** Fondo `bg` casi blanco y neutro; texto `ink` casi negro. En oscuro, negro cálido (`#131110`), nunca gris azulado.
- **Un solo acento: azul de imprenta** (`accent`). Se usa para la fecha, el día seleccionado, las barras de avance, las acciones (+) y el botón principal. Nada más lleva color fuerte.
- **Estados** `ok`, `warn`, `bad`: cumplido, parcial, no cumplido. Son semánticos, no decorativos, y siempre van con una forma (ver Fases).
- **Categorías** `--cat-*`: seis tonos apagados que solo tiñen el ícono del hábito.
- **Regla:** el texto secundario usa `muted`; nunca gris sobre un fondo de color. Sobre azul, el texto es `accent-ink`.

## Typography

Una sola familia, Archivo variable, servida desde el propio sitio, en dos voces:

- **Cifras:** condensadas y pesadas (`font-stretch` 62–68 %, peso 800). Son las protagonistas: fecha del día, porcentajes, cantidades, series.
- **Texto:** ancho normal, pesos 400–700.

Todos los números son tabulares. Miles con espacio fino (`1 500`), decimales con punto (`72.4`). Los rótulos de sección van en 13 px, peso 800, sin mayúsculas forzadas.

## Layout

- Una columna de filas a todo el ancho, con margen lateral de 18 px (o el área segura, si es mayor).
- **Reglas en lugar de cajas:** 2 px de tinta para abrir una sección o un bloque, 1 px gris entre filas.
- Fila estándar de 52 px: `[fase o ícono] [nombre] [cifra] [acción]`. Las cifras se alinean a la derecha.
- Las acciones frecuentes quedan en la mitad inferior de la pantalla o al borde derecho, al alcance del pulgar.
- Barra de cinco pestañas abajo; el botón flotante + aparece en todas las pestañas menos Hoy, donde todo ya está a un toque.
- Áreas táctiles de 44 px como mínimo. Entradas de texto a 16 px para que iOS no haga zoom.

## Elevation & Depth

No hay sombras ni vidrio. La profundidad sale del orden: las hojas inferiores tapan la pantalla con un velo (`scrim`) y una regla superior de 2 px.

## Shapes

Esquinas casi rectas: 4 px en botones y campos, 6 px en avisos y en el botón flotante, 14 px solo en el borde superior de las hojas. El único círculo es la fase.

## Components

### Fases (el gesto propio)
Un círculo de 14 px con borde de 2 px. Lleno y verde: cumplido. Medio y ámbar: parcial. Vacío y rojo: no cumplido. Vacío y gris: pendiente (el día en curso nunca se muestra como fallado). Punteado: en pausa. Guion: no programado. Se usan igual en la fila de la semana, el calendario, los reportes y los puntos de frecuencia.

### Botones
Borde de 1.5 px de tinta, sin relleno. El principal va relleno de azul. Los botones rápidos (+250, +1) usan la voz condensada. Al presionar, escala a 0.97 en 130 ms.

### Campos
Borde de 1.5 px de tinta sobre `surface`. El campo de cantidad principal es grande y condensado.

### Hojas inferiores
Para registrar con detalle, corregir un día y todos los ajustes. Se cierran arrastrando hacia abajo, con la X o tocando fuera.

### Avisos
Barra oscura con el texto del registro y «Deshacer». Abajo, sobre la barra de pestañas; con una hoja abierta, arriba.

### Movimiento
- Lo frecuente (sumar agua, +1 serie) solo tiene la respuesta de presión y la barra que avanza en 260 ms.
- Curva `cubic-bezier(0.23, 1, 0.32, 1)`; todo por debajo de 300 ms salvo hojas y avisos.
- Solo `transform` y `opacity`. Transiciones, no keyframes, en todo lo que se repite.
- La única celebración: la fase del día se llena al completar la meta, y un aviso «Día completo».
- Con Reducir movimiento: sin escalas ni deslizamientos; se conservan los fundidos.

## Do's and Don'ts

### Do:
- Poner la cifra antes que cualquier adorno.
- Separar con reglas y espacio.
- Acompañar todo estado con forma y texto, no solo con color.
- Responder a cada toque en el acto.

### Don't:
- Tarjetas dentro de tarjetas, sombras o vidrio decorativos.
- Un segundo color de acento, degradados o un arcoíris de categorías.
- Emojis como íconos; íconos repetidos dentro de círculos.
- Animar acciones que se hacen muchas veces al día.
- Fuentes por defecto (Inter, Roboto, Arial) o cargadas desde otros servidores.
