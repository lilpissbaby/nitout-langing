/* global L */
import { CONFIG } from './config.js'
import { fiestasDeEjemplo } from './ejemplo.js'
import { tipoDe, claseTipo } from './tipos.js'
import { $, $$, html, pintar, aCadena, icono, giroDe, urlImagen, idSeguro, estadoTemporal, cuandoCorto, rangoFechas, plural, menosMovimiento } from './util.js'

/**
 * El mapa de muestra: un trozo del mapa de la app, con las mismas pegatinas.
 *
 * Leaflet (150 KB) no se carga con la página: se pide cuando la sección
 * está a punto de verse (inicio.js). «En directo» lee GET /api/eventos por
 * el mismo dominio (nginx lo reenvía a la API); si alrededor hay menos de
 * CONFIG.MIN_REALES, pasa solo al ejemplo y lo dice.
 */

const ESTRELLA = 'M24 1.5L28 6.3L33.8 3.7L35.3 9.8L41.6 10L40.4 16.1L45.9 19L42.2 24L45.9 29L40.4 31.9L41.6 38L35.3 38.2L33.8 44.3L28 41.7L24 46.5L20 41.7L14.2 44.3L12.7 38.2L6.4 38L7.6 31.9L2.1 29L5.8 24L2.1 19L7.6 16.1L6.4 10L12.7 9.8L14.2 3.7L20 6.3Z'

const estado = {
  ciudad: 'reus',
  modo: 'directo', // 'directo' | 'ejemplo'
  modoElegido: false, // la persona ha pulsado «en directo»: no saltar solo al ejemplo
  eventos: [],
  elegida: null,
  peticion: null,
}

let mapa
let capaPegatinas
let capaTeselas
let usarRespaldo = false
const marcadores = new Map() // id -> { marcador, ev }

/* ------------------------------------------------------------------ *
 *  Carga perezosa de Leaflet
 * ------------------------------------------------------------------ */

let leaflet
export function cargarLeaflet() {
  leaflet ??= new Promise((listo, fallo) => {
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'vendor/leaflet/leaflet.css'
    // Antes que landing.css, para que nuestras reglas ganen sin !important.
    document.head.insertBefore(css, document.querySelector('link[rel="stylesheet"]'))
    const js = document.createElement('script')
    js.src = 'vendor/leaflet/leaflet.js'
    js.onload = () => listo(window.L)
    js.onerror = () => fallo(new Error('No se ha podido cargar el mapa'))
    document.head.append(js)
  })
  return leaflet
}

/* ------------------------------------------------------------------ *
 *  Arranque
 * ------------------------------------------------------------------ */

export async function iniciarMapa() {
  try {
    await cargarLeaflet()
  } catch {
    $('#mapa-espera').textContent = 'No se ha podido cargar el mapa. Recarga la página para intentarlo otra vez.'
    return
  }
  const ciudad = CONFIG.CIUDADES[estado.ciudad]
  const tactil = window.matchMedia('(pointer: coarse)').matches
  mapa = L.map('mapa-muestra', {
    zoomControl: false,
    attributionControl: true,
    scrollWheelZoom: false, // la rueda es para bajar por la página
    dragging: !tactil, // con un dedo se baja por la página; para mover, pellizcar o los botones
    tapTolerance: 20,
    minZoom: 12,
    maxZoom: 18,
  }).setView(ciudad.centro, zoomPara(ciudad))
  mapa.attributionControl.setPrefix('<a href="https://leafletjs.com" rel="noopener" target="_blank">Leaflet</a>')

  ponerTeselas()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ponerTeselas)
  capaPegatinas = L.layerGroup().addTo(mapa)

  mapa.on('click', cerrarFicha)
  mapa.on('zoomend moveend', () => requestAnimationFrame(colocarNotas))
  $('#mapa-espera').hidden = true

  $('#zoom-mas').addEventListener('click', () => mapa.zoomIn())
  $('#zoom-menos').addEventListener('click', () => mapa.zoomOut())
  document.addEventListener('keydown', (e) => e.key === 'Escape' && cerrarFicha())

  // Una foto que no carga se cambia por el pictograma del tipo (sin onerror en el HTML: CSP).
  $('#mapa-muestra').addEventListener('error', (e) => {
    const img = e.target
    if (!(img instanceof HTMLImageElement)) return
    const vinilo = img.closest('.vinilo')
    if (vinilo) {
      vinilo.classList.remove('con-foto')
      pintar(vinilo, html`${vinilo.classList.contains('estrella') ? html`<svg class="forma" viewBox="0 0 48 48" aria-hidden="true"><path d="${ESTRELLA}"/></svg>` : ''}${icono(tipoDe(img.dataset.tipo).icono)}`)
    }
  }, true)

  enlazarControles()
  await cargar()
}

const zoomPara = (ciudad) => (window.innerWidth < 760 ? ciudad.zoom : ciudad.zoom + 1)

/* ------------------------------------------------------------------ *
 *  Teselas: de día o de noche según el sistema; OSM en gris si fallan
 * ------------------------------------------------------------------ */

function ponerTeselas() {
  const noche = window.matchMedia('(prefers-color-scheme: dark)').matches
  const p = usarRespaldo ? CONFIG.TESELAS_RESPALDO : CONFIG.TESELAS
  const url = ((noche && p.urlNoche) || p.url).replace('{key}', encodeURIComponent(p.clave ?? ''))
  if (capaTeselas) mapa.removeLayer(capaTeselas)
  capaTeselas = L.tileLayer(url, { ...p.opciones, attribution: p.atribucion }).addTo(mapa)

  if (!usarRespaldo) {
    let fallos = 0
    capaTeselas.on('tileerror', () => {
      // Clave de otro dominio, cuota agotada o proveedor caído: a OSM hasta recargar.
      if (++fallos === 4) {
        usarRespaldo = true
        ponerTeselas()
      }
    })
  }
}

/* ------------------------------------------------------------------ *
 *  Controles: ciudad y en directo / ejemplo
 * ------------------------------------------------------------------ */

function enlazarControles() {
  for (const b of $$('[data-ciudad]')) {
    b.addEventListener('click', () => {
      if (estado.ciudad === b.dataset.ciudad) return
      estado.ciudad = b.dataset.ciudad
      for (const o of $$('[data-ciudad]')) o.setAttribute('aria-pressed', String(o === b))
      const c = CONFIG.CIUDADES[estado.ciudad]
      cerrarFicha()
      mapa.setView(c.centro, zoomPara(c), { animate: !menosMovimiento() })
      cargar()
    })
  }
  for (const b of $$('[data-modo]')) {
    b.addEventListener('click', () => {
      estado.modoElegido = b.dataset.modo === 'directo'
      ponerModo(b.dataset.modo)
      cargar()
    })
  }
}

function ponerModo(modo) {
  estado.modo = modo
  for (const o of $$('[data-modo]')) o.setAttribute('aria-pressed', String(o.dataset.modo === modo))
}

/* ------------------------------------------------------------------ *
 *  Datos
 * ------------------------------------------------------------------ */

async function cargar() {
  const ciudad = CONFIG.CIUDADES[estado.ciudad]
  ocultarAviso()
  if (estado.modo === 'ejemplo') return pintarEventos(fiestasDeEjemplo(estado.ciudad, ciudad.centro), 'ejemplo')

  estado.peticion?.abort()
  const control = new AbortController()
  estado.peticion = control
  const [lat, lng] = ciudad.centro
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng), r: String(CONFIG.RADIO_M), limite: '60' })

  let eventos
  try {
    const r = await fetch(`/api/eventos?${params}`, { signal: control.signal, credentials: 'omit', headers: { Accept: 'application/json' } })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const datos = await r.json()
    eventos = Array.isArray(datos?.eventos) ? datos.eventos.filter(valido) : []
  } catch (e) {
    if (e.name === 'AbortError') return
    ponerModo('ejemplo')
    pintarEventos(fiestasDeEjemplo(estado.ciudad, ciudad.centro), 'ejemplo')
    mostrarAviso(html`<p>No hemos podido traer las fiestas de ${ciudad.nombre}. Mientras, te enseñamos un ejemplo.</p>`, 4000)
    return
  }
  if (control.signal.aborted) return

  if (eventos.length < CONFIG.MIN_REALES && !estado.modoElegido) {
    ponerModo('ejemplo')
    pintarEventos(fiestasDeEjemplo(estado.ciudad, ciudad.centro), 'ejemplo')
    return
  }
  pintarEventos(eventos, 'directo')
  if (eventos.length === 0) {
    mostrarAviso(html`<p><b>En ${ciudad.nombre} aún no hay fiestas publicadas.</b> ¿Montas tú la primera?</p>
      <div class="fila-aviso"><button type="button" class="btn btn-claro btn-pequeno" data-ver-ejemplo>Ver el ejemplo</button>
      <a class="btn btn-negro btn-pequeno" href="#organizar">Publicar fiestas</a></div>`)
    $('[data-ver-ejemplo]')?.addEventListener('click', () => {
      estado.modoElegido = false
      ponerModo('ejemplo')
      cargar()
    })
  }
}

/** Lo mínimo para pintar una pegatina; lo que no lo cumpla, fuera. */
function valido(ev) {
  return ev && typeof ev.titulo === 'string' && Number.isFinite(ev.lat) && Number.isFinite(ev.lng) && !ev.cancelado && estadoTemporal(ev) !== 'terminada'
}

/* ------------------------------------------------------------------ *
 *  Pegatinas en el mapa
 * ------------------------------------------------------------------ */

const PRIORIDAD = { ahora: 0, pronto: 1, luego: 2 }

function pintarEventos(eventos, modo) {
  cerrarFicha()
  capaPegatinas.clearLayers()
  marcadores.clear()
  estado.eventos = eventos

  const ordenados = [...eventos].sort((a, b) => PRIORIDAD[estadoTemporal(a)] - PRIORIDAD[estadoTemporal(b)])
  // Las de "luego" debajo: lo que pasa ahora queda encima si se pisan.
  ordenados.forEach((ev, i) => {
    const icon = L.divIcon({ className: 'peg-envoltorio', html: aCadena(marcadorHTML(ev)), iconSize: [44, 44], iconAnchor: [22, 22] })
    const marcador = L.marker([ev.lat, ev.lng], { icon, keyboard: true, riseOnHover: true, zIndexOffset: (ordenados.length - i) * 10 })
    marcador.on('click', (e) => {
      L.DomEvent.stopPropagation(e)
      abrirFicha(ev)
    })
    // Con teclado: Intro o espacio, como en cualquier botón (Leaflet sólo
    // usa Intro para abrir popups, que aquí no hay).
    marcador.on('keypress', (e) => {
      if (e.originalEvent.key === 'Enter' || e.originalEvent.key === ' ') {
        e.originalEvent.preventDefault()
        abrirFicha(ev)
      }
    })
    marcador.addTo(capaPegatinas)
    const el = marcador.getElement()
    if (el) {
      el.setAttribute('role', 'button')
      el.setAttribute('aria-label', `${ev.titulo}. ${tipoDe(ev.tipo).nombre}, ${cuandoCorto(ev)}`)
      el.removeAttribute('title')
    }
    marcadores.set(ev.id, { marcador, ev })
  })

  const chapa = $('#mapa-chapa')
  chapa.hidden = false
  if (modo === 'ejemplo') {
    pintar(chapa, html`<span class="pastilla pastilla-negra">${icono('i-aviso')}ejemplo · estas fiestas no existen</span>`)
  } else {
    pintar(chapa, html`<span class="pastilla pastilla-negra">en directo · ${plural(eventos.length, 'fiesta', 'fiestas')}</span>`)
  }
  pintarListaAccesible(ordenados, modo)
  requestAnimationFrame(colocarNotas)
}

function marcadorHTML(ev) {
  const cuando = estadoTemporal(ev)
  const tipo = tipoDe(ev.tipo)
  const foto = urlImagen(ev.imagen?.mini)
  const dentro = foto ? html`<img src="${foto}" alt="" decoding="async" loading="lazy" data-tipo="${ev.tipo}">` : icono(tipo.icono)
  const vinilo =
    cuando === 'ahora'
      ? html`<span class="vinilo estrella ${foto ? 'con-foto' : ''}"><svg class="forma" viewBox="0 0 48 48" aria-hidden="true"><path d="${ESTRELLA}"/></svg>${dentro}</span>`
      : html`<span class="vinilo ${foto ? 'con-foto' : ''}">${dentro}</span>`
  return html`<span class="peg-mapa ${cuando} ${giroDe(ev.id)}" data-id="${ev.id}">
    <span class="peg-nota">${ev.cancionUrl ? icono('i-nota') : ''}${ev.titulo}</span>
    <span class="pegatina ${claseTipo(ev.tipo)} ${cuando} ${giroDe(ev.id)}" aria-hidden="true">
      ${vinilo}
      ${foto ? html`<span class="chapa-tipo">${icono(tipo.icono)}</span>` : ''}
    </span>
  </span>`
}

/**
 * Las notas no se pisan: se colocan por prioridad (elegida, ahora, pronto,
 * luego) y la que chocaría con una ya puesta se esconde. Si se sale por un
 * lado del mapa, se desplaza hacia dentro (--dx, por CSSOM).
 */
function colocarNotas() {
  if (!mapa) return
  const caja = mapa.getContainer().getBoundingClientRect()
  const puestas = []
  // Las pegatinas también son obstáculos: una nota no tapa la de otra fiesta igual
  // de importante o más (sí puede pisar una de «luego» si ella es de «ahora»).
  const pegatinas = new Map()
  for (const { marcador, ev } of marcadores.values()) {
    const r = marcador.getElement()?.querySelector('.pegatina')?.getBoundingClientRect()
    if (r) pegatinas.set(ev.id, { l: r.left, r: r.right, t: r.top, b: r.bottom, peso: peso(ev) })
  }
  // La ficha abierta también tapa: las notas que caerían debajo, fuera.
  const ficha = $('#ficha')
  if (!ficha.hidden) {
    const r = ficha.getBoundingClientRect()
    puestas.push({ l: r.left, r: r.right, t: r.top, b: r.bottom })
  }
  const lista = [...marcadores.values()].sort((a, b) => peso(a.ev) - peso(b.ev))
  for (const { marcador, ev } of lista) {
    const el = marcador.getElement()?.querySelector('.peg-mapa')
    const nota = el?.querySelector('.peg-nota')
    if (!el || !nota) continue
    el.classList.remove('sin-nota')
    nota.style.setProperty('--dx', '0px')
    const r = nota.getBoundingClientRect()
    let dx = 0
    if (r.left < caja.left + 8) dx = caja.left + 8 - r.left
    else if (r.right > caja.right - 70) dx = caja.right - 70 - r.right // deja sitio a los botones de zoom
    const caja1 = { l: r.left + dx - 4, r: r.right + dx + 4, t: r.top - 3, b: r.bottom + 3 }
    const fuera = r.bottom < caja.top + 60 || r.top > caja.bottom
    const pisa = (p) => caja1.l < p.r && caja1.r > p.l && caja1.t < p.b && caja1.b > p.t
    const choca = puestas.some(pisa) || [...pegatinas].some(([id, p]) => id !== ev.id && p.peso <= peso(ev) && pisa(p))
    if (fuera || choca) {
      el.classList.add('sin-nota')
      continue
    }
    if (dx) nota.style.setProperty('--dx', `${Math.round(dx)}px`)
    puestas.push(caja1)
  }
}

function peso(ev) {
  if (estado.elegida === ev.id) return -1
  return PRIORIDAD[estadoTemporal(ev)] ?? 3
}

/* ------------------------------------------------------------------ *
 *  Ficha
 * ------------------------------------------------------------------ */

function abrirFicha(ev) {
  marcarElegida(ev.id)
  const cuando = estadoTemporal(ev)
  const tipo = tipoDe(ev.tipo)
  const foto = urlImagen(ev.imagen?.mini)
  const id = idSeguro(ev.id)
  const pegatina = html`<span class="pegatina ${claseTipo(ev.tipo)} ${cuando} ${giroDe(ev.id)}" aria-hidden="true">${
    cuando === 'ahora'
      ? html`<span class="vinilo estrella ${foto ? 'con-foto' : ''}"><svg class="forma" viewBox="0 0 48 48"><path d="${ESTRELLA}"/></svg>${foto ? html`<img src="${foto}" alt="" data-tipo="${ev.tipo}">` : icono(tipo.icono)}</span>`
      : html`<span class="vinilo ${foto ? 'con-foto' : ''}">${foto ? html`<img src="${foto}" alt="" data-tipo="${ev.tipo}">` : icono(tipo.icono)}</span>`
  }</span>`

  const ficha = $('#ficha')
  pintar(ficha, html`
    <div class="ficha-arriba">
      ${pegatina}
      <div>
        <div class="ficha-chapas">
          <span class="pastilla pastilla-tipo ${claseTipo(ev.tipo)}">${tipo.nombre}</span>
          <span class="pastilla ${cuando === 'ahora' ? 'pastilla-ahora' : ''}">${cuandoCorto(ev)}</span>
        </div>
        <h3>${ev.titulo}</h3>
      </div>
    </div>
    <ul class="ficha-lineas">
      <li>${icono('i-reloj')}${rangoFechas(ev)}</li>
      ${ev.organiza ? html`<li>${icono('i-gente')}Organiza: ${ev.organiza}</li>` : ''}
      ${Number.isFinite(ev.suscritos) && ev.suscritos > 0 ? html`<li>${icono('i-check')}${plural(ev.suscritos, 'persona se apunta', 'personas se apuntan')}</li>` : ''}
      ${ev.cancionUrl ? html`<li>${icono('i-nota')}Tiene canción: en la app suena al tocar la pegatina</li>` : ''}
    </ul>
    ${ev.ejemplo
      ? html`<p class="ficha-ejemplo">Es una fiesta de ejemplo: no existe.</p>
        <a class="btn btn-negro btn-pequeno" href="${CONFIG.APP_URL}/">Ver las de verdad</a>`
      : id ? html`<a class="btn btn-negro btn-pequeno" href="${CONFIG.APP_URL}/#/evento/${id}">Verla en nit out</a>` : ''}
    <button type="button" class="boton-redondo ficha-cerrar" aria-label="Cerrar la ficha">${icono('i-cerrar')}</button>
  `)
  ficha.hidden = false
  $('.ficha-cerrar', ficha).addEventListener('click', cerrarFicha)
  requestAnimationFrame(colocarNotas)
}

function marcarElegida(id) {
  for (const { marcador, ev } of marcadores.values()) {
    const el = marcador.getElement()?.querySelector('.peg-mapa')
    if (!el) continue
    const es = ev.id === id
    el.classList.toggle('elegida', es)
    // El momento de DISENO.md: la pegatina con canción se balancea. Una sola a la vez.
    el.classList.toggle('sonando', es && Boolean(ev.cancionUrl))
    if (es) marcador.setZIndexOffset(10_000)
  }
  estado.elegida = id
  requestAnimationFrame(colocarNotas)
}

function cerrarFicha() {
  if (!estado.elegida) return
  const volver = estado.elegida
  estado.elegida = null
  $('#ficha').hidden = true
  for (const { marcador, ev } of marcadores.values()) {
    const el = marcador.getElement()?.querySelector('.peg-mapa')
    el?.classList.remove('elegida', 'sonando')
    if (ev.id === volver) {
      marcador.setZIndexOffset(0)
      // El foco vuelve a la pegatina que abrió la ficha.
      if (document.activeElement?.closest?.('#ficha')) marcador.getElement()?.focus()
    }
  }
  requestAnimationFrame(colocarNotas)
}

/* ------------------------------------------------------------------ *
 *  Avisos y lista para lectores de pantalla
 * ------------------------------------------------------------------ */

let temporizadorAviso
function mostrarAviso(contenido, ms = 0) {
  const aviso = $('#mapa-aviso')
  pintar(aviso, contenido)
  aviso.hidden = false
  clearTimeout(temporizadorAviso)
  if (ms) temporizadorAviso = setTimeout(ocultarAviso, ms)
}
function ocultarAviso() {
  clearTimeout(temporizadorAviso)
  $('#mapa-aviso').hidden = true
}

function pintarListaAccesible(eventos, modo) {
  const ciudad = CONFIG.CIUDADES[estado.ciudad].nombre
  pintar($('#lista-accesible'), html`
    <li>${modo === 'ejemplo' ? `Fiestas de ejemplo en ${ciudad}, no existen:` : `Fiestas publicadas cerca de ${ciudad}:`}</li>
    ${eventos.map((ev) => html`<li>${ev.titulo}. ${tipoDe(ev.tipo).nombre}, ${cuandoCorto(ev)}.</li>`)}
  `)
}
