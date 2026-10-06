/**
 * Los tipos de fiesta. Copia de kedada/public/js/tipos.js: las claves TIENEN
 * que coincidir con TIPOS_EVENTO de la API. Si allí cambian, cambian aquí.
 * El color va por la clase .t-<tipo> de landing.css.
 */
export const TIPOS = {
  ayuntamiento: { nombre: 'Ayuntamiento', icono: 'i-ayuntamiento' },
  bar: { nombre: 'Bar', icono: 'i-bar' },
  discoteca: { nombre: 'Discoteca', icono: 'i-discoteca' },
  pub: { nombre: 'Pub', icono: 'i-pub' },
  casual: { nombre: 'Casual', icono: 'i-casual' },
  manifestacion: { nombre: 'Manifestación', icono: 'i-manifestacion' },
  particular: { nombre: 'Particular', icono: 'i-particular' },
}

/** Un tipo que no conocemos (la API añadió uno) sale con la chincheta gris, sin romper nada. */
export const tipoDe = (clave) => TIPOS[clave] ?? { nombre: 'Fiesta', icono: 'i-nota' }
export const claseTipo = (clave) => (clave in TIPOS ? `t-${clave}` : '')
