# Especificación — App de hábitos y registro personal (PWA)

Versión: 16 nov 2026 · Autor: Sebas

## Resumen

Una app web instalable (PWA) en español para registrar hábitos, actividades, entrenamientos, peso corporal y tareas. En la fase 1 se usa solo en el iPhone y los datos se guardan en el propio teléfono; la sincronización con la laptop queda para una fase posterior. Guarda todo el historial sin borrar nada y genera reportes semanales, quincenales, mensuales, trimestrales, anuales y de cualquier rango.

El objetivo es tener un registro personal completo para analizar mis hábitos y mejorar. Tiene que ser rápida de usar: registrar algo del día debe tomar uno o dos toques.

Convenciones: idioma español (Perú), zona horaria America/Lima, la semana empieza el lunes, unidades métricas (kg, ml, minutos).

## Plataforma y arquitectura

PWA offline-first. En la fase 1 todos los datos viven en el iPhone: no hay base de datos en la nube ni inicio de sesión.

| Pieza | Elección sugerida | Por qué |
| --- | --- | --- |
| Frontend | React + Vite + TypeScript | Moderno y fácil de mantener |
| Estilos y movimiento | CSS con tokens de diseño (o Tailwind configurado con esos tokens) + Motion para gestos y resortes | Necesario para el nivel de detalle de la sección Diseño |
| Gráficos | Recharts o visx, con estilo propio | Los estilos por defecto se ven genéricos |
| Datos | IndexedDB (con Dexie.js) + almacenamiento persistente (navigator.storage.persist) | Funciona sin internet y todo se guarda al instante |
| Respaldo | Exportar JSON a Archivos o iCloud Drive con el menú Compartir de iOS; importar desde un archivo | Protege el historial si se borra la app |
| Hosting | GitHub Pages (gratis) | Única cuenta necesaria; publica el código, no los datos |
| Fase posterior | Supabase para sincronizar con la laptop | El modelo de datos ya queda preparado |

Reglas de almacenamiento:

1. Todo se guarda al instante en el iPhone y funciona sin internet.
2. Cada registro lleva id único (UUID), fechas de creación y de modificación y una marca de borrado lógico, para poder sincronizar en el futuro sin migrar datos.
3. Si borro el ícono de la pantalla de inicio o limpio los datos del sitio, iOS elimina la información. Por eso la app pide almacenamiento persistente, muestra la fecha del último respaldo y recuerda hacer uno cada semana.
4. La app se usa siempre desde el ícono de inicio, no desde una pestaña de Safari, porque iOS guarda esos datos por separado.

Instalación en iPhone: abrir la URL en Safari → Compartir → "Agregar a pantalla de inicio". Debe tener ícono, pantalla de carga y verse a pantalla completa, sin barra del navegador. Diseñada para iPhone: uso con una mano, acciones al alcance del pulgar y zonas seguras del notch y la barra de inicio.

## Tipos de seguimiento y reglas de cálculo

Cada hábito pertenece a uno de seis tipos. El tipo define cómo se registra y cómo se calcula si cumplí.

| Tipo | Cómo se registra | Cuándo se cumple | Ejemplo |
| --- | --- | --- | --- |
| Sí/No | Un toque | Marcado ese día | Tender la cama |
| Cantidad con meta | Botones rápidos + valor libre, se acumula en el día | Suma del día ≥ meta | Agua 2000 ml |
| Duración | Minutos a mano (botones rápidos + valor libre) | Minutos del día (o semana) ≥ meta | Anki 30 min |
| Frecuencia por periodo | Un toque por vez (con duración o nota opcional) | Veces en la semana o mes ≥ meta | Speaking 3 veces a la semana |
| Evento (solo registro) | Un toque, con nota, lugar o gasto opcionales | No tiene meta; solo cuenta | Salidas de fiesta |
| Medición | Un valor numérico con fecha | No tiene meta; se ve la tendencia (meta objetivo opcional) | Peso corporal |

Reglas generales:

- **Estado por día:** cumplido (verde), parcial (amarillo, cuando hay avance pero no alcanza la meta), no cumplido (rojo), pausa o descanso (gris; no cuenta en contra), no programado (vacío).
- **Rachas:** racha actual y máxima por hábito. En los hábitos semanales, la racha se cuenta en semanas cumplidas.
- **% de cumplimiento** = periodos cumplidos ÷ periodos programados, sin contar las pausas.
- **Metas con vigencia:** cada meta guarda fecha de inicio y de fin. Si cambio una meta, el pasado se evalúa con la meta que estaba vigente entonces.
- **Edición retroactiva:** puedo registrar o corregir días pasados (por ejemplo, si olvidé anotar ayer).
- **Semana:** de lunes a domingo. **Quincena:** del 1 al 15 y del 16 al fin de mes.

## Hábitos iniciales

La app arranca con estos registros ya creados. Todos se pueden editar, pausar o archivar después.

| Hábito | Categoría | Tipo | Meta | Detalle de registro |
| --- | --- | --- | --- | --- |
| Tomar agua | Salud | Cantidad con meta | 2000 ml al día | Botones +250, +500 y +750 ml; valor libre; deshacer el último |
| Anki | Estudio / Inglés | Duración | Mínimo 30 min al día | Minutos anotados a mano (sin cronómetro); los minutos extra también se guardan |
| Practicar speaking | Estudio / Inglés | Frecuencia | Al menos 3 veces a la semana | Duración y nota opcionales (con quién, tema) |
| Película en inglés | Estudio / Inglés | Frecuencia | 1 a la semana | Título y calificación de 1 a 5 opcionales |
| Gimnasio | Salud | Módulo gym (ver abajo) | A definir en la app | Series por grupo muscular; ejercicio, peso y repeticiones opcionales |
| Peso corporal | Salud | Medición | Peso objetivo opcional | kg con un decimal; hora opcional |
| Salir de fiesta | Social | Evento | Sin meta | Nota y gasto opcionales |
| Comer fuera | Social | Evento | Sin meta | Lugar, con quién y gasto opcionales |
| Intimidad | Privado | Evento | Sin meta | Solo el toque; nota opcional. Categoría privada (ver Privacidad) |

Sugerencia opcional para analizar mejor los hábitos: un check-in diario breve con horas de sueño, energía (1–5) y ánimo (1–5). Sirve para cruzarlo con el resto en los reportes.

## Crear y editar hábitos

Un asistente paso a paso permite agregar cualquier hábito nuevo durante el año sin tocar código.

1. **Nombre, ícono y color**, elegidos de una galería de emojis o íconos.
2. **Categoría**: Salud, Estudio, Social, Trabajo, Personal o Privado; también se pueden crear categorías nuevas.
3. **Tipo**: uno de los seis, cada uno con su explicación y un ejemplo.
4. **Meta**: valor y unidad (ml, min, veces, páginas, km…) y periodo (día, semana o mes). En tipos con meta, puede ser mínima ("al menos") o máxima ("como mucho", para hábitos que quiero reducir).
5. **Programación**: todos los días, días específicos (lun-mié-vie), X veces por semana en cualquier día, o un rango de fechas con inicio y fin opcional.
6. **Botones rápidos** para los tipos de cantidad, por ejemplo +250 ml.
7. **Opciones**: privado sí/no, recordatorio (fase 3), orden en la pantalla Hoy.
8. **Vista previa y guardar.**

Acciones sobre un hábito existente: editar (si cambio la meta, se crea una nueva versión con vigencia desde hoy), pausar entre dos fechas, archivar (desaparece de Hoy pero su historial sigue en los reportes) y reordenar arrastrando.

## Módulo de gym y peso corporal

Lo principal es contar las series por grupo muscular cada semana. El detalle de ejercicio, peso y repeticiones es opcional.

**Grupos musculares** (lista editable): pecho, espalda, hombros, bíceps, tríceps, antebrazos, cuádriceps, isquiotibiales, glúteos, pantorrillas, abdomen, cardio. Cada grupo tiene una meta semanal de series configurable, por ejemplo 10 a 20, con rango mínimo y máximo.

**Registrar una sesión**, con dos niveles:

1. **Rápido**: elijo el grupo y toco +1 serie (o escribo el número). En menos de 10 segundos queda registrado.
2. **Detallado (opcional)**: elijo un ejercicio de la biblioteca y anoto cada serie con peso (kg) y repeticiones. Las series se suman solas al grupo del ejercicio.

Más datos opcionales de la sesión: duración, nota y esfuerzo percibido (1–10).

**Biblioteca de ejercicios**: editable. Cada ejercicio tiene un grupo principal y, si quiero, grupos secundarios; una serie cuenta 1 para el principal y 0.5 para cada secundario, y esa regla se puede desactivar. Al elegir un ejercicio se muestran el peso y las repeticiones de la última vez.

**Rutinas (cuando las defina)**: plantillas como "Día A – Pecho y tríceps", con ejercicios y series objetivo, que se cargan con un toque al iniciar la sesión. La app funciona sin rutinas.

**Vistas del gym**: barras de series por grupo en la semana actual contra la meta (en verde, en rango; en amarillo, bajo la meta; en rojo, por encima del máximo); evolución semanal de series por grupo; récords personales por ejercicio (peso máximo y 1RM estimado); volumen total (series × reps × kg).

**Peso corporal**: registro rápido en kg, gráfico de línea con media móvil de 7 días, variación semanal y mensual, peso objetivo opcional dibujado como línea de referencia. Campos opcionales a futuro: % de grasa y medidas (cintura, brazo).

## Tareas

Las tareas van separadas de los hábitos: son cosas por hacer que se completan, no rutinas que se miden.

| Programación | Ejemplo |
| --- | --- |
| Fecha única | Renovar DNI el 30/11 |
| Fecha límite (aparece desde hoy hasta vencer) | Entregar informe antes del viernes |
| Rango de fechas (visible cada día del rango) | Preparar examen del 1 al 15 de diciembre |
| Días de la semana | Sacar la basura lunes y jueves |
| Recurrente | Cada 2 semanas, el día 1 de cada mes o cada año |
| Sin fecha (bandeja) | Ideas por hacer algún día |

Campos: título, nota, categoría, prioridad (alta, media o baja), subtareas con checklist y hora opcional.

Comportamiento: las tareas vencidas sin completar se pasan solas a "Atrasadas"; se puede posponer con un toque (mañana o la próxima semana); al completarla se guarda la fecha real de cierre para medir puntualidad en los reportes.

## Pantallas

Hay cinco pestañas en la barra inferior, más un botón flotante "+" para registrar cualquier cosa desde donde esté.

| Pestaña | Qué muestra |
| --- | --- |
| Hoy | Fecha, % del día cumplido; tarjetas de hábitos de hoy con su progreso (barra de agua, minutos de Anki, "1 de 3 esta semana" en speaking); tareas de hoy y atrasadas; botón para registrar eventos. Se puede cambiar a ayer o a otro día para registrar tarde |
| Calendario | Vista mensual con color por día según el cumplimiento; filtro por hábito; al tocar un día se ve y se edita todo lo de ese día |
| Gym | Semana actual por grupo muscular, iniciar sesión, historial de sesiones, biblioteca de ejercicios, rutinas, peso corporal |
| Reportes | Selector de periodo y todas las métricas (ver Reportes y análisis) |
| Más | Mis hábitos (crear, editar, archivar), tareas, categorías, privacidad, respaldo e importación (con la fecha del último respaldo), tema claro u oscuro |

## Diseño e interacción

La interfaz no debe parecer una plantilla genérica hecha por IA. Fable debe instalar y leer estos dos paquetes de skills antes de escribir cualquier pantalla, y seguirlos en todo el proyecto.

| Skills | Qué aportan | Instalación |
| --- | --- | --- |
| [Emil Kowalski](https://emilkowal.ski/skill): emil-design-eng, animate, review-animations, improve-animations | Criterio de animación (cuándo animar, curva, duración, propiedades), componentes pulidos y los detalles que hacen que una interfaz se sienta bien | `npx skills add emilkowalski/skill` |
| [Impeccable](https://impeccable.style), de Paul Bakaus | Vocabulario de diseño, referencias de tipografía, color, layout, movimiento, interacción y textos de interfaz; lista de antipatrones; comandos como typeset, colorize o quieter | `npx skills add pbakaus/impeccable` |

**Proceso de diseño:**

1. Antes de construir, Fable me muestra 2 o 3 direcciones visuales distintas de la pantalla Hoy (tipografía, color, densidad) y yo elijo una.
2. La dirección elegida se fija como tokens: colores en modo claro y oscuro, escala tipográfica, espaciado, radios, curvas y duraciones de animación.
3. Al cerrar cada fase, se revisan las animaciones con review-animations de Emil y la interfaz con la auditoría de Impeccable. Todo lo grave se corrige antes de entregar.

**Dirección de partida**, para ajustar en el paso 1: una bitácora personal sobria y táctil, no un dashboard corporativo. Los números son los protagonistas: cifras grandes con dígitos tabulares (1 500 / 2 000 ml, 30 min, 14 series). Un solo color de acento fuerte; las categorías se distinguen con tonos apagados, no con un arcoíris. En modo oscuro, un fondo casi negro y cálido, no gris azulado.

**Qué evitar:** fuentes elegidas por defecto (Inter, Roboto, Arial), degradados morados, tarjetas dentro de tarjetas, texto gris sobre fondos de color, todo centrado, sombras o efectos de vidrio decorativos, y el mismo ícono dentro de un círculo repetido en cada tarjeta.

**Reglas de interacción**, aplicadas a esta app:

- Lo que hago muchas veces al día (sumar agua, +1 serie) responde al instante: sin animaciones largas, solo una leve reducción de escala al presionar y la barra de progreso que avanza.
- Lo que pasa pocas veces puede celebrarse más: completar la meta del día o una racha de 7 días.
- Duraciones cortas (por debajo de 300 ms en la interfaz) y curvas ease-out personalizadas. Nada aparece desde escala 0: empieza cerca de 0.95 con opacidad.
- Se animan solo transform y opacity, y las animaciones se pueden interrumpir.
- Los registros se abren en hojas inferiores que se cierran arrastrando hacia abajo, al estilo de Vaul.
- Cada registro muestra un aviso breve con "Deshacer", al estilo de Sonner ("+500 ml · Deshacer").
- Se respeta la opción Reducir movimiento de iOS, sin efectos hover en pantalla táctil, con áreas táctiles de al menos 44 pt.

## Reportes y análisis

Cada reporte se calcula para el periodo elegido y se compara con el periodo anterior de igual duración.

**Periodos:** semana, quincena, mes, trimestre, semestre, año y rango personalizado, con flechas para moverse entre periodos.

**Resumen general:** % de cumplimiento total, hábitos cumplidos y fallados, mejor y peor hábito, días perfectos (todo cumplido), comparación con el periodo anterior (por ejemplo, "82 % vs 74 %, +8 puntos").

**Por hábito, según su tipo:**

| Tipo | Métricas |
| --- | --- |
| Cantidad / Duración | Total, promedio diario, % de días con la meta cumplida, mejor día, gráfico diario contra la línea de meta |
| Frecuencia | Semanas cumplidas ÷ semanas del periodo, veces por semana |
| Sí/No | % de días cumplidos, rachas |
| Evento | Conteo por periodo, promedio por semana, días de la semana más frecuentes, días desde el último, gasto total si se registró |
| Medición | Valor inicial y final, variación, mínimo, máximo, tendencia |
| Gym | Sesiones, series por grupo contra la meta, volumen, récords nuevos |
| Tareas | Completadas, atrasadas, % a tiempo |

**Visualizaciones:** mapa de calor anual estilo GitHub por hábito, barras semanales, líneas de tendencia, cumplimiento por día de la semana.

**Patrones (análisis personal):** correlaciones simples entre registros, por ejemplo: "los días después de salir de fiesta cumples Anki 40 % menos", "cuando vas al gym, tomas más agua" o "tu peor día es el domingo". Se muestran como frases automáticas, solo con datos suficientes (mínimo 4 semanas).

**Revisión semanal:** el lunes se genera un resumen de la semana anterior, con espacio para escribir una reflexión (qué salió bien y qué mejorar). Las reflexiones quedan guardadas.

**Exportar reporte:** PDF o imagen para guardar, y CSV con los datos del periodo.

## Privacidad, datos e historial

Nada se borra de verdad, y los datos personales solo los veo yo.

- **Sin cuenta en la fase 1:** no hay inicio de sesión. Los datos no salen del iPhone, salvo que yo exporte un respaldo.
- **PIN de la app:** código de 4 a 6 dígitos al abrir, opcional, con bloqueo tras X minutos sin uso.
- **Categoría Privado:** sus hábitos se ven en Hoy con un nombre o ícono discreto (por ejemplo, "● Privado"). En Calendario y Reportes se ocultan hasta tocar "Mostrar privados" e ingresar el PIN.
- **Sin terceros:** ni analíticas, ni rastreadores, ni peticiones de red con mis datos.
- **Historial permanente:** borrar es solo lógico, con papelera recuperable por 30 días. Archivar un hábito conserva sus datos. Las metas se versionan con fechas de vigencia.
- **Respaldo:** exportar todo a JSON (respaldo completo) y a CSV (una tabla por tipo, para Excel o Power BI), guardando en Archivos o iCloud Drive. Importar desde JSON. Aviso semanal en Hoy si el último respaldo tiene más de 7 días.

**Modelo de datos mínimo** (todas las tablas llevan id UUID, user_id, created_at, updated_at y deleted_at):

| Tabla | Campos clave |
| --- | --- |
| categories | name, color, icon, is_private |
| habits | name, icon, color, category_id, type, unit, schedule (JSON), quick_buttons, is_private, archived_at, sort_order |
| habit_goals | habit_id, target_value, period (day/week/month), direction (min/max), valid_from, valid_to |
| habit_logs | habit_id, date, value, duration_min, note, extra (JSON: lugar, gasto, título, calificación) |
| habit_pauses | habit_id, start_date, end_date, reason |
| muscle_groups | name, weekly_min_sets, weekly_max_sets |
| exercises | name, primary_group_id, secondary_group_ids |
| workouts | date, duration_min, rpe, note, routine_id |
| workout_sets | workout_id, muscle_group_id, exercise_id (opcional), weight_kg, reps, set_count |
| routines | name, items (JSON) |
| body_metrics | date, weight_kg, body_fat_pct, measurements (JSON) |
| tasks | title, note, category_id, priority, schedule (JSON), due_date, start_date, end_date, completed_at, subtasks (JSON) |
| daily_checkins | date, sleep_hours, energy, mood, note |
| weekly_reviews | week_start, went_well, to_improve |

## Fases, pasos y criterios de aceptación

Conviene construirla en tres fases para tener algo usable en la primera semana.

| Fase | Incluye |
| --- | --- |
| 1. Base en el iPhone | PWA instalable, datos locales, los 6 tipos de hábito, hábitos iniciales, asistente de creación, Hoy, Calendario, peso corporal, gym rápido (series por grupo muscular), reporte semanal y mensual básico, categoría Privado con PIN, respaldo JSON |
| 2. Profundidad | Gym detallado (ejercicios, peso, repeticiones, rutinas, récords), tareas, todos los periodos y gráficos de reportes, revisión semanal, check-in diario, exportar a CSV y PDF |
| 3. Conexión | Sincronización con la laptop (Supabase, con cuenta gratuita), recordatorios push (iOS 16.4 o superior, app instalada en la pantalla de inicio), patrones automáticos |

**Lo que tengo que hacer yo** (Fable debe guiarme paso a paso):

- [x] Crear una cuenta gratuita en GitHub y el repositorio `sebaszelly/mibitacora`
- [ ] Publicar la app con GitHub Pages siguiendo los pasos de Fable
- [ ] Abrir la URL en Safari del iPhone → Compartir → "Agregar a pantalla de inicio"
- [ ] Usar la app siempre desde ese ícono
- [ ] Hacer un respaldo semanal en Archivos o iCloud Drive

**Criterios de aceptación:**

- Registrar 500 ml de agua toma un toque desde Hoy y responde al instante.
- En modo avión puedo registrar y ver todo.
- Al cerrar la app o reiniciar el iPhone, los datos siguen ahí.
- Si cambio la meta de agua a 2500 ml, los reportes de meses anteriores siguen evaluándose contra 2000 ml.
- Un hábito archivado sigue apareciendo en los reportes de su periodo.
- El gym muestra cuántas series llevo esta semana por grupo, sin obligarme a anotar peso ni repeticiones.
- Los registros privados no aparecen en Reportes sin el PIN.
- Exportar JSON, borrar los datos e importar ese JSON deja todo igual.
- La interfaz pasa review-animations de Emil y la auditoría de Impeccable sin problemas graves.

## Decisiones acordadas durante la construcción

Acordadas con Sebas el 17 nov 2026. Donde contradicen el texto de arriba, mandan estas.

- **Sin cronómetro.** Anki y los demás hábitos de duración se registran anotando los minutos a mano.
- **% del día cumplido:** solo cuentan los hábitos con meta diaria. Los semanales muestran su avance aparte ("1 de 3 esta semana") y se evalúan al cerrar la semana.
- **PIN:** es un bloqueo de pantalla, no un cifrado. El respaldo JSON incluye los registros privados en claro y no incluye el PIN. Si se olvida, se recupera borrando los datos e importando un respaldo.
- **Gráficos:** en la fase 1 se dibujan a medida en SVG, sin Recharts ni visx. Se revisa en la fase 2.
- **Íconos:** dibujados, de un solo trazo y peso. No se usan emojis como íconos.
- **Fuentes e íconos servidos desde el propio sitio**, sin Google Fonts ni otros servidores.
- **Reglas de cálculo que faltaban:** una semana o un mes se evalúa con la meta vigente en su último día; un periodo empezado o terminado a medias solo cuenta si se cumplió; el día o la semana en curso nunca se muestra como fallado; Gimnasio solo cuenta sesiones hasta que se le ponga meta.
- **Dispositivo de prueba:** iPhone 17 con iOS 26.
