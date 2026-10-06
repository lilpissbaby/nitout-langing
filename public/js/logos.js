import { CONFIG } from './config.js'
import { $, html, pintar, giroDe } from './util.js'

/**
 * La tira de «Organizan con nit out».
 *
 * OJO: los marcados con `ejemplo: true` son entidades INVENTADAS (logos
 * dibujados para esta maqueta). No salen NUNCA en los dominios de
 * producción (CONFIG.DOMINIOS_PRODUCCION): poner el logo de alguien que no
 * ha firmado sería un aval falso. Si en producción no queda ningún logo de
 * verdad, la sección no sale.
 *
 * Para añadir uno de verdad: su SVG en img/logos/, una línea aquí sin
 * `ejemplo`, y el permiso por escrito de esa organización (README → Logos).
 */
const LOGOS = [
  { nombre: 'Ajuntament de Vilafosca', archivo: 'ajuntament-vilafosca.svg', ejemplo: true },
  { nombre: 'Sala Fanal', archivo: 'sala-fanal.svg', ejemplo: true },
  { nombre: 'Bar La Parada', archivo: 'bar-la-parada.svg', ejemplo: true },
  { nombre: 'Colla del Trabuc', archivo: 'colla-del-trabuc.svg', ejemplo: true },
  { nombre: 'Festival Marea Baixa', archivo: 'festival-marea-baixa.svg', ejemplo: true },
  { nombre: 'Pub Tres Corbs', archivo: 'pub-tres-corbs.svg', ejemplo: true },
  { nombre: 'Fiestas del Barrio Alto', archivo: 'fiestas-barrio-alto.svg', ejemplo: true },
  { nombre: 'Cervecería La Espuela', archivo: 'cerveceria-la-espuela.svg', ejemplo: true },
  { nombre: 'Asociación Vecinal El Rebollar', archivo: 'av-el-rebollar.svg', ejemplo: true },
  { nombre: 'Colectivo Barrio Vivo', archivo: 'colectivo-barrio-vivo.svg', ejemplo: true },
]

export const enProduccion = () => CONFIG.DOMINIOS_PRODUCCION.includes(location.hostname)

export function iniciarLogos() {
  const visibles = enProduccion() ? LOGOS.filter((l) => !l.ejemplo) : LOGOS
  if (visibles.length === 0) return

  const seccion = $('#organizan')
  const item = (l, copia) => html`<li class="logo-peg ${giroSuave(l.archivo)}" ${copia ? html`aria-hidden="true"` : ''}>
    <img src="img/logos/${l.archivo}" alt="${copia ? '' : l.nombre}" width="160" height="42" loading="lazy" decoding="async">
  </li>`
  // Dos copias seguidas: la pista se desliza media longitud y vuelve sin salto.
  pintar($('#tira-pista'), html`${visibles.map((l) => item(l, false))}${visibles.map((l) => item(l, true))}`)
  $('#logos-ejemplo').hidden = !visibles.some((l) => l.ejemplo)
  seccion.hidden = false

  // Pausar (WCAG 2.2.2: lo que se mueve solo más de 5 s se tiene que poder parar).
  const boton = $('#logos-pausa')
  const tira = $('#tira')
  boton.addEventListener('click', () => {
    const pausada = tira.classList.toggle('pausada')
    boton.setAttribute('aria-pressed', String(pausada))
    pintar(boton, html`<svg class="ico" aria-hidden="true"><use href="#${pausada ? 'i-play' : 'i-pausa'}"/></svg><span>${pausada ? 'Seguir' : 'Pausar'}</span>`)
  })

  // Fuera de la pantalla no se mueve: ni gasta batería ni distrae.
  new IntersectionObserver(([e]) => tira.classList.toggle('fuera', !e.isIntersecting)).observe(tira)
}

/** Las pegatinas de la tira, rectas o casi: un giro pequeño, siempre el mismo. */
function giroSuave(clave) {
  return { 'rot-0': 'gs-0', 'rot-1': 'gs-1', 'rot-2': 'gs-2', 'rot-3': 'gs-3', 'rot-4': 'gs-4', 'rot-5': 'gs-0', 'rot-6': 'gs-2' }[giroDe(clave)]
}
