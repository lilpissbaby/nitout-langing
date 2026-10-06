/**
 * Despegar: el detalle de cursor (DISENO.md → Piezas propias).
 *
 * Con ratón, la pegatina que tienes debajo se inclina hacia el puntero, como
 * si levantaras una esquina con la uña, y su sombra crece. Sólo transform
 * (lo pinta la GPU) y un requestAnimationFrame por movimiento. Con pantalla
 * táctil o movimiento reducido no hace nada.
 */
const MAX_GIRO = 10 // grados

export function iniciarDespegar() {
  const conRaton = window.matchMedia('(hover: hover) and (pointer: fine)')
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (!conRaton.matches || reducido.matches) return

  let actual = null
  let pendiente = null
  let marco = 0

  const soltar = () => {
    if (!actual) return
    actual.classList.remove('levantada')
    actual.style.removeProperty('--rx')
    actual.style.removeProperty('--ry')
    actual = null
  }

  const pintarGiro = () => {
    marco = 0
    if (!pendiente) return
    const { el, x, y } = pendiente
    pendiente = null
    if (el !== actual) {
      soltar()
      actual = el
      el.classList.add('levantada')
    }
    const r = el.getBoundingClientRect()
    // -1…1 desde el centro. Se levanta el lado más cercano al puntero.
    const nx = Math.max(-1, Math.min(1, ((x - r.left) / r.width) * 2 - 1))
    const ny = Math.max(-1, Math.min(1, ((y - r.top) / r.height) * 2 - 1))
    el.style.setProperty('--rx', `${(-ny * MAX_GIRO).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(nx * MAX_GIRO).toFixed(2)}deg`)
  }

  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return
    const el = e.target instanceof Element ? e.target.closest('.despega') : null
    if (!el) return soltar()
    pendiente = { el, x: e.clientX, y: e.clientY }
    if (!marco) marco = requestAnimationFrame(pintarGiro)
  }, { passive: true })
  document.addEventListener('pointerleave', soltar)
  window.addEventListener('blur', soltar)
}
