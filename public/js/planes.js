import { $, html, pintar, icono, euros } from './util.js'

/**
 * Los planes salen de GET /api/planes (lo mismo que enseña la app en
 * «Anúnciate»): si se cambia un precio en el panel, cambia aquí.
 * Si la API no responde, no se inventa ningún precio: se pide que escriban.
 */
export async function iniciarPlanes() {
  let datos
  try {
    const r = await fetch('/api/planes', { credentials: 'omit', headers: { Accept: 'application/json' } })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    datos = await r.json()
  } catch {
    $('#planes').hidden = true
    $('#planes-error').hidden = false
    return
  }

  const planes = Array.isArray(datos?.planes) ? datos.planes.filter((p) => Number.isFinite(p?.precioMensual) && p.precioMensual > 0) : []
  if (planes.length === 0) {
    $('#planes').hidden = true
    $('#planes-error').hidden = false
  } else {
    pintar($('#planes'), html`${planes.map(tarjeta)}`)
  }

  if (Number.isFinite(datos?.anuncio?.precioCent) && datos.anuncio.precioCent > 0) {
    $('#precio-anuncio').textContent = `por ${euros(datos.anuncio.precioCent)}`
  }
  // Sin pagos activos (producción sin Stripe), la venta lleva «muy pronto».
  $('#venta-pronto').hidden = Boolean(datos?.pagos)
}

function tarjeta(p) {
  const aLaVez = Math.max(0, Math.min(Number(p.fiestasALaVez) || 0, 99))
  const huecos = Math.min(aLaVez, 10)
  const comision = Number.isFinite(p.comisionBps) ? `${(p.comisionBps / 100).toLocaleString('es-ES')} % por entrada vendida` : ''
  const fotos = Number(p.fotosPorFiesta) || 0
  return html`<li class="plan">
    <div class="plan-cifra"><b>${aLaVez}</b><span>a la vez</span></div>
    <div>
      <h4>${p.nombre}</h4>
      <p class="plan-precio">${euros(Math.round(p.precioMensual * 100))}<small>al mes</small></p>
    </div>
    <div class="huecos" aria-hidden="true">${Array.from({ length: huecos }, () => html`<i></i>`)}</div>
    <ul class="plan-lista">
      <li>${icono('i-check')}${aLaVez === 1 ? 'Una fiesta en el mapa a la vez' : `Hasta ${aLaVez} fiestas a la vez`}${p.fiestasAlMes ? `, ${p.fiestasAlMes} al mes` : ''}</li>
      <li>${icono('i-camara')}${fotos === 1 ? 'Una foto por fiesta' : `${fotos} fotos por fiesta`}</li>
      ${comision ? html`<li>${icono('i-tique')}${comision}</li>` : ''}
      ${p.reciclar ? html`<li>${icono('i-reciclar')}Reciclar fiestas con su público</li>` : html`<li class="no">${icono('i-menos')}Sin reciclar fiestas</li>`}
    </ul>
    <a class="btn btn-papel btn-pequeno plan-pedir" href="#contacto" ${/^[a-z]{2,20}$/.test(p.id ?? '') ? html`data-plan="${p.id}"` : ''}>Pedir el plan ${p.nombre}</a>
  </li>`
}
