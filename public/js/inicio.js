import { CONFIG } from './config.js'
import { $, $$ } from './util.js'
import { iniciarDespegar } from './despegar.js'
import { iniciarLogos } from './logos.js'
import { iniciarPlanes } from './planes.js'
import { iniciarContacto } from './contacto.js'

/**
 * Arranque de la landing. Lo pesado (Leaflet y las teselas del mapa) sólo
 * se pide cuando la sección del mapa está a punto de verse.
 */

iniciarDespegar()
iniciarTiendas()
iniciarLogos()
iniciarContacto()
// Margen corto: Leaflet y las teselas son lo que más pesa de la página.
cuandoSeAcerque($('#mapa-caja'), () => import('./mapa.js').then((m) => m.iniciarMapa()), '200px')
cuandoSeAcerque($('#organizar'), iniciarPlanes, '600px')

/** Ejecuta `fn` una vez, cuando `el` está a `margen` de entrar en pantalla. */
function cuandoSeAcerque(el, fn, margen = '500px') {
  if (!el) return
  if (!('IntersectionObserver' in window)) return fn()
  const obs = new IntersectionObserver((entradas) => {
    if (entradas.some((e) => e.isIntersecting)) {
      obs.disconnect()
      fn()
    }
  }, { rootMargin: margen })
  obs.observe(el)
}

/**
 * Tiendas: sin enlace es una pegatina «pronto en …» que no lleva a ningún
 * sitio. Con enlace en config.js, pasa a «Descárgala en …».
 */
function iniciarTiendas() {
  for (const a of $$('[data-tienda]')) {
    const url = CONFIG.TIENDAS[a.dataset.tienda]
    if (!url || !/^https:\/\/(apps\.apple\.com|play\.google\.com)\//.test(url)) continue
    a.href = url
    a.removeAttribute('aria-disabled')
    a.rel = 'noopener'
    const pre = a.querySelector('.tienda-pre')
    if (pre) pre.textContent = 'Descárgala en'
  }
}
