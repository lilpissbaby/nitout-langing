import { CONFIG } from './config.js'
import { $, $$ } from './util.js'

/**
 * Formulario «Cuéntanos qué montas» → POST /api/contacto (mismo dominio;
 * nginx lo reenvía a la API). La API valida otra vez, limita por IP,
 * comprueba Turnstile si está configurado y manda el correo a hola@.
 *
 * Turnstile se carga sólo cuando el formulario va a verse y sólo si hay
 * clave (CONFIG.TURNSTILE_SITEKEY): no se le pide nada a Cloudflare si nadie
 * baja hasta aquí.
 */

const MENSAJES = {
  nombre: 'Escribe tu nombre.',
  organizacion: 'Escribe el nombre del bar, la sala o la organización.',
  tipo: 'Elige qué es.',
  ciudad: 'Escribe la ciudad o el pueblo.',
  correo: 'Escribe un correo válido, por ejemplo nombre@dominio.es.',
  acepto: 'Marca la casilla para que podamos contestarte.',
}

let tokenTurnstile = ''
let idTurnstile = null
const cargadoEn = Date.now()

export function iniciarContacto() {
  const form = $('#formulario')

  // «Pedir el plan…», «Pedir el convenio» y «Pedir una fiesta» dejan el plan
  // elegido en el formulario. Delegado: las tarjetas de los planes llegan después.
  document.addEventListener('click', (e) => {
    const a = e.target instanceof Element ? e.target.closest('[data-plan]') : null
    const select = $('#f-plan')
    if (a && [...select.options].some((o) => o.value === a.dataset.plan)) select.value = a.dataset.plan
  })

  // Al salir de un campo se dice qué falta; al corregirlo se quita el aviso.
  for (const campo of $$('input, select, textarea', form)) {
    campo.addEventListener('blur', () => campo.dataset.tocado && validarCampo(campo))
    campo.addEventListener('input', () => {
      campo.dataset.tocado = '1'
      if (campo.getAttribute('aria-invalid') === 'true') validarCampo(campo)
    })
    campo.addEventListener('change', () => {
      campo.dataset.tocado = '1'
      if (campo.getAttribute('aria-invalid') === 'true') validarCampo(campo)
    })
  }

  form.addEventListener('submit', enviar)

  if (CONFIG.TURNSTILE_SITEKEY) {
    new IntersectionObserver((entradas, obs) => {
      if (entradas.some((e) => e.isIntersecting)) {
        obs.disconnect()
        cargarTurnstile()
      }
    }, { rootMargin: '400px' }).observe(form)
  }
}

function validarCampo(campo) {
  if (!(campo.name in MENSAJES) && campo.type !== 'email') return true
  const valor = campo.type === 'checkbox' ? campo.checked : campo.value.trim()
  let ok = Boolean(valor)
  if (ok && campo.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(campo.value.trim())
  ponerError(campo, ok ? '' : MENSAJES[campo.name])
  return ok
}

function ponerError(campo, mensaje) {
  const id = `${campo.id}-error`
  let nodo = document.getElementById(id)
  if (!mensaje) {
    campo.removeAttribute('aria-invalid')
    campo.removeAttribute('aria-describedby')
    nodo?.remove()
    return
  }
  campo.setAttribute('aria-invalid', 'true')
  campo.setAttribute('aria-describedby', id)
  if (!nodo) {
    nodo = document.createElement('p')
    nodo.id = id
    nodo.className = 'error-campo'
    ;(campo.closest('.campo, .casilla') ?? campo.parentElement).append(nodo)
  }
  nodo.textContent = mensaje
}

async function enviar(e) {
  e.preventDefault()
  const form = e.currentTarget
  const estado = $('#f-estado')
  const boton = $('#f-enviar')
  estado.textContent = ''
  estado.classList.remove('error')

  const campos = $$('input, select, textarea', form).filter((c) => c.name && c.name !== 'web')
  const malos = campos.filter((c) => !validarCampo(c))
  if (malos.length) {
    malos[0].focus()
    estado.textContent = malos.length === 1 ? 'Revisa el campo marcado.' : `Revisa los ${malos.length} campos marcados.`
    estado.classList.add('error')
    return
  }
  if (CONFIG.TURNSTILE_SITEKEY && !tokenTurnstile) {
    estado.textContent = 'Espera a que termine la comprobación de seguridad de debajo y vuelve a pulsar «Enviar mensaje».'
    estado.classList.add('error')
    return
  }

  const datos = Object.fromEntries(new FormData(form))
  const cuerpo = {
    nombre: datos.nombre.trim(),
    organizacion: datos.organizacion.trim(),
    tipo: datos.tipo,
    ciudad: datos.ciudad.trim(),
    correo: datos.correo.trim(),
    telefono: datos.telefono?.trim() || undefined,
    plan: datos.plan || undefined,
    mensaje: datos.mensaje?.trim() || undefined,
    acepto: true,
    // La trampa y cuánto se tardó en rellenar: la API descarta lo que huele a robot.
    web: datos.web || undefined,
    segundos: Math.round((Date.now() - cargadoEn) / 1000),
    turnstile: tokenTurnstile || undefined,
  }

  boton.disabled = true
  boton.textContent = 'Enviando…'
  try {
    const r = await fetch('/api/contacto', {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    if (r.ok) return enviado(cuerpo.correo)

    const error = (await r.json().catch(() => null))?.error
    if (r.status === 400 && Array.isArray(error?.detalles)) {
      for (const d of error.detalles) {
        const campo = form.elements.namedItem(String(d.campo))
        if (campo instanceof HTMLElement && 'value' in campo) ponerError(campo, d.problema)
      }
      estado.textContent = error.mensaje || 'Revisa los campos marcados.'
    } else if (r.status === 429) {
      estado.textContent = 'Has mandado varios mensajes seguidos. Prueba dentro de un rato o escríbenos a hola@nitout.com.'
    } else if (r.status === 403 && error?.codigo === 'sin_permiso') {
      estado.textContent = 'No hemos podido comprobar que no eres un robot. Recarga la página y vuelve a intentarlo.'
    } else {
      estado.textContent = 'No se ha podido enviar. Vuelve a intentarlo en un momento o escríbenos a hola@nitout.com.'
    }
    estado.classList.add('error')
  } catch {
    estado.textContent = 'No se ha podido enviar. Revisa la conexión y vuelve a intentarlo.'
    estado.classList.add('error')
  } finally {
    boton.disabled = false
    boton.textContent = 'Enviar mensaje'
    reiniciarTurnstile()
  }
}

function enviado(correo) {
  $('#formulario').hidden = true
  $('#enviado-texto').textContent = `Te escribimos a ${correo} en cuanto lo leamos.`
  const caja = $('#enviado')
  caja.hidden = false
  caja.focus()
}

/* ------------------------------------------------------------------ *
 *  Turnstile (explícito: el widget sale donde decimos y cuando decimos)
 * ------------------------------------------------------------------ */

function cargarTurnstile() {
  window.alTurnstile = () => {
    idTurnstile = window.turnstile.render('#turnstile', {
      sitekey: CONFIG.TURNSTILE_SITEKEY,
      language: 'es',
      theme: 'auto',
      callback: (t) => { tokenTurnstile = t },
      'expired-callback': () => { tokenTurnstile = '' },
      'error-callback': () => { tokenTurnstile = '' },
    })
  }
  const s = document.createElement('script')
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=alTurnstile'
  s.async = true
  document.head.append(s)
}

function reiniciarTurnstile() {
  if (idTurnstile !== null && window.turnstile) {
    tokenTurnstile = ''
    window.turnstile.reset(idTurnstile)
  }
}
