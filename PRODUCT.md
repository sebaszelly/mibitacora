# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite + TypeScript, PWA offline-first, publicada en GitHub Pages. Elección sugerida por la spec (`SPEC.md`, sección "Plataforma y arquitectura"); el detalle de librerías queda delegado a quien construye, dentro de esa base.

## Users

Un solo usuario: Sebas, el autor. La usa en su iPhone (iOS 26), instalada en la pantalla de inicio, con una mano. La abre en ráfagas de pocos segundos a lo largo del día: cada vez que toma agua, termina Anki o pasa algo que quiere registrar, anota y cierra. No hay otros usuarios, ni cuentas, ni audiencia externa.

## Product Purpose

Un registro personal completo de hábitos, actividades, entrenamientos y peso corporal (tareas en la fase 2), para analizar sus propios hábitos y mejorar. Éxito: registrar algo del día toma uno o dos toques, todo el historial se conserva para siempre y los reportes dicen la verdad sobre cada periodo.

## Positioning

No es un tracker genérico de rachas: cada hábito tiene uno de seis tipos de seguimiento con su propia regla de cumplimiento, las metas se versionan con fechas de vigencia (el pasado se evalúa con la meta de entonces) y nada se borra de verdad. Los datos viven solo en el teléfono.

## Operating Context

- Español (Perú), zona horaria America/Lima, semana de lunes a domingo, unidades métricas (kg, ml, minutos). Quincena: del 1 al 15 y del 16 a fin de mes.
- Se usa siempre desde el ícono de la pantalla de inicio, a pantalla completa, también sin conexión.
- Registros de alta frecuencia: sumar agua, +1 serie en el gym. De baja frecuencia: completar la meta del día, rachas, respaldo semanal.
- Fase 1: datos solo en el iPhone (IndexedDB). Fase 3: sincronización con la laptop.

## Capabilities and Constraints

- Seis tipos de hábito: Sí/No, Cantidad con meta, Duración, Frecuencia por periodo, Evento, Medición. Más un módulo de gym (series por grupo muscular) y peso corporal.
- Estado por día: cumplido, parcial, no cumplido, pausa, no programado.
- El "% del día cumplido" se calcula solo con los hábitos de meta diaria. Los hábitos semanales muestran su avance aparte ("1 de 3 esta semana") y se evalúan al cerrar la semana. (Confirmado por el usuario.)
- Sin terceros: ni analíticas, ni rastreadores, ni fuentes o recursos cargados desde otros servidores. Todo se sirve desde el propio sitio.
- Categoría Privado: nombre discreto en Hoy; oculta en Calendario y Reportes hasta ingresar el PIN.
- Respaldo: exportar e importar JSON; aviso si el último respaldo tiene más de 7 días.
- Borrado solo lógico, con papelera recuperable 30 días.
- Alcance por fases y criterios de aceptación: ver `SPEC.md`.

## Brand Commitments

- Nombre del repositorio: `mibitacora`. Nombre visible de la app: sin decidir.
- Dirección de partida fijada en la spec: una bitácora personal sobria y táctil, no un dashboard corporativo. Los números son los protagonistas, con dígitos tabulares. Un solo color de acento fuerte; las categorías se distinguen con tonos apagados. En modo oscuro, fondo casi negro y cálido, no gris azulado.
- Qué evitar, fijado en la spec: Inter, Roboto o Arial; degradados morados; tarjetas dentro de tarjetas; texto gris sobre fondos de color; todo centrado; sombras o vidrio decorativos; el mismo ícono dentro de un círculo repetido en cada tarjeta.
- Reglas de interacción fijadas en la spec: respuesta instantánea en lo frecuente; celebración solo en lo poco frecuente; duraciones bajo 300 ms; ease-out propio; nada desde escala 0; solo transform y opacity; animaciones interrumpibles; hojas inferiores que se cierran arrastrando; aviso con "Deshacer" en cada registro; Reducir movimiento respetado; áreas táctiles de 44 pt o más.

## Evidence on Hand

- `SPEC.md`: especificación completa, hábitos iniciales con sus metas, modelo de datos y criterios de aceptación.
- No hay datos reales todavía. Las cifras de cualquier maqueta son de demostración.
- No hay logo ni ícono de la app.

## Product Principles

1. Registrar es más rápido que pensarlo: uno o dos toques, respuesta al instante.
2. El número manda: la cifra del día se lee antes que cualquier adorno.
3. El historial es sagrado: nada se pierde, nada se reescribe hacia atrás.
4. Privado de verdad: los datos no salen del teléfono salvo que él los exporte.
5. Honesta con el fallo: un día no cumplido se muestra sin dramatizar ni esconderlo.

## Accessibility & Inclusion

Áreas táctiles de 44 pt como mínimo, Reducir movimiento respetado, contraste AA, y los estados (cumplido, parcial, no cumplido, pausa) no se distinguen solo por color.
