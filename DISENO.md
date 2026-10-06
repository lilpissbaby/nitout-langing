# nit out · landing (nitout.com) · diseño

La dirección visual de nit out es **Pegatina** y vive en `kedada/DISENO.md`:
paleta, letras, forma, iconos, voz. **Aquella manda**. Este fichero solo
recoge lo que la landing añade o decide por su cuenta. Si un cambio aquí
contradice el de la app, se dice antes de hacerlo.

Skills: `nitout-diseno` (obligatoria) y `frontend-design` para el criterio.
Para revisar: `design:design-critique`, `design:accessibility-review` y
`design:ux-copy`.

## Para quién y para qué

- **Gente que sale**: entender en cinco segundos qué es nit out y abrir el mapa.
- **Quien organiza** (bares, salas, pubs, ayuntamientos, comisiones de fiestas,
  colectivos): ver qué gana, cuánto cuesta y escribirnos.

## La idea

La misma pared de la app: **hormigón con pegatinas**. La cabecera es un trozo
de pared (`--hormigon`) y el titular son **tres notas** (las etiquetas blancas
que salen encima de las pegatinas en el mapa), cada una pegada con su giro.
Alrededor, pegatinas de verdad de la app: la estrella de «ahora», los
círculos de cada tipo y un tique. Todo lo demás es papel blanco y tinta,
callado.

## Lo único con audacia

La cabecera. El resto (mapa, logos, planes, formulario) va recto y sin adornos.

## Tokens

Los de `kedada/public/css/app.css`, copiados tal cual en `css/landing.css`
(`--papel`, `--tinta`, `--gris`, `--claro`, `--hormigon`, `--rojo`, los siete
vinilos `.t-<tipo>`, `--pegada`, `--filo`, radios). La landing solo añade:

| Token | Valor | Trabajo |
|---|---|---|
| `--ancho` | 1180px | Ancho máximo del contenido |
| `--margen` | `clamp(16px, 4vw, 40px)` | Margen lateral (16 px en el móvil) |
| `--titular` | `clamp(46px, 9vw, 112px)` | Notas del titular |
| `--seccion` | `clamp(64px, 10vw, 128px)` | Aire entre secciones |

## Letra

- **Nit Out Rótulo** (TeX Gyre Adventor Bold): titular, títulos, botones, chips,
  cifras de los planes. Titular en minúscula, como el logo.
- **Nit Out Texto** (Lato): todo lo que se lee. Párrafos de 17 px como mucho,
  de 62 caracteres de ancho como mucho.
- Precios y horas con `tabular-nums`.

## Ritmo de la página

```
[hormigón] cabecera: logo · El mapa · Para organizar · Contacto · [Abrir el mapa]
           notas del titular + entradilla + [Abrir el mapa] [Organizo fiestas]
           pronto en App Store · pronto en Google Play        pegatinas sueltas
[papel]    «Así se ve»: ciudades + en directo/ejemplo · mapa · leyenda
[papel]    tira de logos en pegatinas blancas (con «Pausar»)
[tinta]    para organizar: lista de lo que ganas · planes · convenio · una sola fiesta
[papel]    formulario «Cuéntanos qué montas»
[tinta]    pie
```

Todo alineado a la izquierda. Nada centrado salvo los botones dentro de sus pegatinas.

## Piezas propias

- **Notas del titular**: `span.nota-titular`, papel con `--filo` y `--pegada`,
  radio 14 px, giro fijo de −2,5° a 2°. De noche siguen en papel claro: son
  objetos.
- **Despegar** (el detalle de cursor): con ratón, la pegatina o la nota que
  tienes debajo se inclina hacia ti (hasta 10°, `perspective`) y su sombra
  crece, como si levantaras una esquina con la uña. Solo `transform`; solo con
  `(hover: hover) and (pointer: fine)` y sin `prefers-reduced-motion`.
  `js/despegar.js` pone `--rx` y `--ry` por CSSOM.
- **Mapa de muestra**: el mismo marcador que la app (pegatina + nota). Tocar
  una pegatina abre una ficha pequeña dentro del mapa y la pegatina se
  balancea (`sonando`). Es la única animación infinita de la página, y solo
  después de un toque. Con datos de ejemplo, el mapa lleva la chapa negra
  **«ejemplo»** y cada ficha lo repite.
- **Tira de logos**: cada logo va en una **pegatina blanca** recta con
  troquel; los logos en tinta. Se desliza sola y se para con «Pausar» (WCAG
  2.2.2), al pasar el ratón o con movimiento reducido. Los logos de ejemplo
  **no salen nunca en nitout.com** (`js/logos.js`).
- **Tarjeta de plan** (la de `kedada/DISENO.md`): cifra de fiestas a la vez en
  Rótulo grande con «a la vez» debajo y los **huecos** de bono. Datos de
  `GET /api/planes`.
- **Tiendas**: pegatinas blancas «pronto en App Store / Google Play» sin los
  logos de Apple ni Google. Cuando haya enlace, cambian a «Descárgala en» con
  la insignia oficial.

## Movimiento

- Al cargar, las pegatinas de la cabecera se pegan una detrás de otra (escala
  1,15 → 1 y opacidad, 200 ms, 70 ms entre una y otra). Es el único momento
  orquestado.
- Lo demás responde a la persona: despegar, abrir la ficha y la pegatina que
  se balancea.
- `prefers-reduced-motion` lo apaga todo y deja la tira de logos quieta.

## Voz

La de la app: castellano de España, de tú. Nada de «Descubre», «increíble»
ni emojis. El botón dice lo que pasa: «Enviar» → «Mensaje enviado».

## Lo que esta página no hace

- No pide la ubicación: se elige ciudad.
- No pone cookies ni carga analítica (Cloudflare ya cuenta las visitas).
- No usa logos de marcas reales ni insignias de tiendas hasta tener permiso.
