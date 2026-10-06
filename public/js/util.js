/* Utilidades sin estado (las mismas que kedada/public/js/util.js, recortadas). */

/**
 * Plantillas HTML con escape automático. Todo lo que se interpola se escapa
 * salvo que venga de otra plantilla html``: un título con <script> se pinta
 * como texto. Es lo que permite usar innerHTML con datos de la API.
 */
const CRUDO = Symbol('crudo')
export const crudo = (s) => ({ [CRUDO]: String(s) })

export function escapar(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

export function html(partes, ...valores) {
  let salida = ''
  partes.forEach((p, i) => {
    salida += p
    if (i < valores.length) salida += aTexto(valores[i])
  })
  return crudo(salida)
}

function aTexto(v) {
  if (v == null || v === false) return ''
  if (Array.isArray(v)) return v.map(aTexto).join('')
  if (typeof v === 'object' && CRUDO in v) return v[CRUDO]
  return escapar(v)
}

export function pintar(el, plantilla) {
  el.innerHTML = aTexto(plantilla)
  return el
}

export const aCadena = (plantilla) => aTexto(plantilla)
export const $ = (sel, raiz = document) => raiz.querySelector(sel)
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)]

/** Sólo rutas de nuestra API de imágenes (lo que manda la API), nada más. */
export function urlImagen(u) {
  return typeof u === 'string' && /^\/api\/imagenes\/[A-Za-z0-9_-]{1,80}$/.test(u) ? u : ''
}

/** Un id de la API (24 hex). Evita meter cualquier cosa en un enlace. */
export const idSeguro = (id) => (typeof id === 'string' && /^[a-f0-9]{24}$/.test(id) ? id : '')

export const icono = (id, clase = 'ico') => html`<svg class="${clase}" aria-hidden="true"><use href="#${id}"/></svg>`

/** Cada fiesta cae siempre con el mismo giro (.rot-0 … .rot-6), igual que en la app. */
export function giroDe(id = '') {
  let h = 0
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return `rot-${h % 7}`
}

/* ---------------- fechas (como en la app) ---------------- */

const fmtHora = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' })
const fmtSemana = new Intl.DateTimeFormat('es-ES', { weekday: 'short' })
const fmtDia = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
const hora = (d) => fmtHora.format(d)

function inicioDia(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
const diasEntre = (a, b) => Math.round((inicioDia(b) - inicioDia(a)) / 86_400_000)

function diaRelativo(fecha, ahora = new Date()) {
  const n = diasEntre(ahora, fecha)
  if (n === 0) return 'Hoy'
  if (n === 1) return 'Mañana'
  const t = fmtDia.format(fecha).replace('.', '')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** 'ahora' | 'pronto' | 'luego' | 'terminada': decide la forma de la pegatina. */
export function estadoTemporal(ev, ahora = new Date()) {
  const empieza = new Date(ev.empiezaEn)
  const termina = new Date(ev.terminaEn)
  if (termina <= ahora) return 'terminada'
  if (empieza <= ahora) return 'ahora'
  return (empieza - ahora) / 60_000 < 180 ? 'pronto' : 'luego'
}

/** "ahora", "en 20 min", "23:30" o "sáb 22:00". */
export function cuandoCorto(ev, ahora = new Date()) {
  const empieza = new Date(ev.empiezaEn)
  const termina = new Date(ev.terminaEn)
  if (termina <= ahora) return 'terminó'
  if (empieza <= ahora) return 'ahora'
  const min = (empieza - ahora) / 60_000
  if (min < 60) return `en ${Math.max(1, Math.round(min))} min`
  const corte = inicioDia(ahora)
  corte.setDate(corte.getDate() + 1)
  corte.setHours(6)
  if (empieza < corte) return hora(empieza)
  return `${fmtSemana.format(empieza).replace('.', '').toLowerCase()} ${hora(empieza)}`
}

/** "Hoy · 22:00 – 04:00" o "Sáb 20 sep 23:00 – dom 21 sep 06:00". */
export function rangoFechas(ev) {
  const a = new Date(ev.empiezaEn)
  const b = new Date(ev.terminaEn)
  const mismaNoche = diasEntre(a, b) === 0 || (diasEntre(a, b) === 1 && b.getHours() < 12)
  if (mismaNoche) return `${diaRelativo(a)} · ${hora(a)} – ${hora(b)}`
  return `${diaRelativo(a)} ${hora(a)} – ${diaRelativo(b).toLowerCase()} ${hora(b)}`
}

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

export function euros(cent) {
  const e = cent / 100
  return `${Number.isInteger(e) ? e : e.toFixed(2).replace('.', ',')} €`
}

/** ¿Pide el sistema menos movimiento? */
export const menosMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
