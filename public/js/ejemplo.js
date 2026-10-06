/**
 * Fiestas DE EJEMPLO para el mapa de muestra. No existen: el mapa lleva la
 * chapa «ejemplo» y cada ficha lo repite. Las horas salen de la hora actual,
 * para que siempre haya algo pasando «ahora», algo «pronto» y algo «luego».
 *
 * [título, tipo, Δlat, Δlng, empieza (min desde ahora), dura (min), organiza, ¿canción?, apuntados]
 * Δ en grados desde el centro de la ciudad (config.js). Puestas a mano para
 * no caer en el mar.
 */
const FIESTAS = {
  reus: [
    ['Vermut a la plaça del Mercadal', 'bar', 0.0013, -0.0021, -50, 190, 'Bar de la plaza', true, 64],
    ['Correfoc de la Festa Major', 'ayuntamiento', -0.0019, 0.0016, 35, 120, 'Ayuntamiento', true, 312],
    ['Karaoke dels dijous', 'pub', -0.0009, -0.0042, -20, 240, 'Pub del barrio', true, 41],
    ['Sessió de tancament', 'discoteca', 0.0036, 0.0041, 240, 300, 'Sala de la avenida', true, 128],
    ['Concentració per l’habitatge', 'manifestacion', 0.0026, 0.0004, 1380, 120, 'Asamblea del barrio', false, 205],
    ['Quedada de patins al parc', 'casual', -0.0041, -0.0011, 55, 90, 'Una quedada abierta', false, 23],
    ['Aniversari a la terrassa', 'particular', 0.0009, 0.0056, 300, 240, 'Lucía', true, 18],
    ['Jazz al pati', 'pub', -0.0031, 0.0044, 1540, 150, 'Pub con patio', true, 37],
  ],
  tarragona: [
    ['Castells a la plaça', 'ayuntamiento', -0.0011, 0.0055, -40, 150, 'Ayuntamiento', true, 420],
    ['Tardeo de vermut', 'bar', 0.0018, -0.0031, -15, 200, 'Bar de la Rambla', true, 58],
    ['Nit de rumba', 'discoteca', 0.0032, 0.0012, 180, 360, 'Sala del puerto', true, 96],
    ['Trivial de los miércoles', 'pub', -0.0004, -0.0052, 25, 150, 'Pub del centro', false, 30],
    ['Cadena humana por el clima', 'manifestacion', 0.0021, -0.0012, 1420, 90, 'Colectivo del barrio', false, 167],
    ['Ruta en bici de noche', 'casual', 0.0042, -0.0046, 70, 120, 'Una quedada abierta', false, 26],
    ['Sopar a la fresca', 'particular', 0.0006, 0.0034, 260, 200, 'Marta y Pau', true, 14],
  ],
  salou: [
    ['Fuegos en el paseo', 'ayuntamiento', 0.0004, 0.0028, -10, 60, 'Ayuntamiento', true, 540],
    ['Happy hour en la terraza', 'bar', 0.0019, -0.0024, -60, 180, 'Bar de la playa', true, 72],
    ['Fiesta de espuma', 'discoteca', 0.0041, 0.0009, 200, 300, 'Sala de verano', true, 150],
    ['Noche de karaoke', 'pub', 0.0012, 0.0052, 40, 210, 'Pub del paseo', true, 39],
    ['Vóley al atardecer', 'casual', 0.0006, -0.0055, 30, 90, 'Una quedada abierta', false, 22],
    ['Cumple sorpresa de Álex', 'particular', 0.0033, -0.0040, 320, 240, 'Sus amigos', true, 16],
    ['Concentración por el comercio local', 'manifestacion', 0.0027, 0.0031, 1500, 90, 'Asociación de comerciantes', false, 88],
  ],
  barcelona: [
    ['Vermut musical a la plaça', 'bar', 0.0008, 0.0019, -45, 180, 'Bar de la plaza', true, 81],
    ['Concert a la plaça de la Vila', 'ayuntamiento', -0.0018, -0.0012, 30, 120, 'Ayuntamiento del distrito', true, 260],
    ['Sessió de vinils', 'pub', -0.0006, 0.0047, -30, 210, 'Pub de vinilos', true, 47],
    ['Nit de techno', 'discoteca', 0.0034, -0.0036, 270, 360, 'Sala del barrio', true, 190],
    ['Manifestació per l’habitatge', 'manifestacion', -0.0034, 0.0021, 1410, 150, 'Asamblea del barrio', false, 640],
    ['Intercanvi de llibres', 'casual', 0.0024, 0.0035, 50, 120, 'Una quedada abierta', false, 34],
    ['Comiat del pis', 'particular', -0.0027, -0.0045, 310, 240, 'Júlia', true, 21],
    ['Jam session', 'pub', 0.0041, 0.0008, 1560, 180, 'Pub con escenario', true, 52],
  ],
  madrid: [
    ['Vermú y tardeo en la plaza', 'bar', 0.0007, 0.0016, -55, 200, 'Bar de la plaza', true, 93],
    ['Verbena de barrio', 'ayuntamiento', -0.0021, -0.0014, 40, 240, 'Junta de distrito', true, 480],
    ['Karaoke de los jueves', 'pub', -0.0008, 0.0049, -25, 240, 'Pub del barrio', true, 44],
    ['Sesión de indie hasta las 6', 'discoteca', 0.0036, -0.0038, 230, 360, 'Sala de conciertos', true, 210],
    ['Mani por la vivienda', 'manifestacion', -0.0036, 0.0026, 1400, 150, 'Asamblea del barrio', false, 870],
    ['Quedada de patines en el parque', 'casual', 0.0028, 0.0038, 60, 90, 'Una quedada abierta', false, 31],
    ['Cumple de Lucía en la terraza', 'particular', -0.0029, -0.0047, 290, 240, 'Lucía', true, 19],
    ['Concierto de la banda del barrio', 'ayuntamiento', 0.0044, 0.0006, 1600, 120, 'Junta de distrito', true, 150],
  ],
}

/** Las fiestas de ejemplo de una ciudad, con el formato de GET /api/eventos. */
export function fiestasDeEjemplo(clave, centro, ahora = Date.now()) {
  return (FIESTAS[clave] ?? []).map(([titulo, tipo, dLat, dLng, empiezaMin, duraMin, organiza, cancion, suscritos], i) => {
    // Redondeo a 5 min: así la hora no cambia en cada visita del mismo rato.
    const base = Math.floor(ahora / 300_000) * 300_000
    const empiezaEn = new Date(base + empiezaMin * 60_000).toISOString()
    const terminaEn = new Date(base + (empiezaMin + duraMin) * 60_000).toISOString()
    return {
      id: `ejemplo-${clave}-${i}`,
      titulo,
      tipo,
      lat: centro[0] + dLat,
      lng: centro[1] + dLng,
      empiezaEn,
      terminaEn,
      cancionUrl: cancion ? 'ejemplo' : null,
      imagen: null,
      suscritos,
      organiza,
      ejemplo: true,
    }
  })
}
