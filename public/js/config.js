/**
 * Configuración de la landing. Es el ÚNICO fichero de JS que cambia entre
 * entornos, y casi nunca hace falta tocarlo:
 *
 *  - La dirección de la app (https://app.nitout.com) la cambia nginx al
 *    servir (sub_filter con APP_URL del .env), aquí y en el HTML. En el VPS
 *    de pruebas pasa a ser https://kedada.tenebrum.online sin tocar código.
 *  - La API va por el mismo dominio: nginx reenvía sólo GET /api/eventos,
 *    GET /api/planes, GET /api/imagenes/… y POST /api/contacto.
 */
export const CONFIG = {
  APP_URL: 'https://app.nitout.com',

  // Dominios de producción: aquí NUNCA salen los logos de ejemplo (js/logos.js).
  DOMINIOS_PRODUCCION: ['nitout.com', 'www.nitout.com'],

  // Enlaces de las tiendas. Vacío = «pronto en …», sin enlace.
  // Cuando estén publicadas, pon la URL y cambia el botón por la insignia
  // oficial (README → Tiendas).
  TIENDAS: {
    ios: '',
    android: '',
  },

  // Mapa base, el mismo proveedor que la app. La clave de CARTO es pública
  // por definición (va en un fichero estático) y CARTO la ata a los dominios
  // que declaraste: añade nitout.com y el de pruebas, o pide una para la
  // landing (README → Mapa). Si falla, se usa OSM en gris.
  TESELAS: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key={key}',
    urlNoche: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key={key}',
    clave: 'cb1_30iu_1_b834ca4f945bda44cc47f031',
    opciones: { subdomains: 'abcd', maxZoom: 19 },
    atribucion: '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" rel="noopener" target="_blank">CARTO</a>',
  },
  TESELAS_RESPALDO: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    opciones: { subdomains: 'abc', maxZoom: 19, className: 'capa-osm' },
    atribucion: '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener" target="_blank">OpenStreetMap</a>',
  },

  // Con menos fiestas reales que esto alrededor, el mapa pasa solo al ejemplo.
  MIN_REALES: 5,
  RADIO_M: 6_000,

  // Ciudades del selector. [lat, lng] de un punto céntrico y sin mar al lado.
  CIUDADES: {
    reus: { nombre: 'Reus', centro: [41.1561, 1.1069], zoom: 15 },
    tarragona: { nombre: 'Tarragona', centro: [41.1186, 1.2508], zoom: 15 },
    salou: { nombre: 'Salou', centro: [41.0786, 1.1385], zoom: 15 },
    barcelona: { nombre: 'Barcelona', centro: [41.4023, 2.1566], zoom: 15 },
    madrid: { nombre: 'Madrid', centro: [40.4262, -3.7041], zoom: 15 },
  },

  // Cloudflare Turnstile. Vacío = el formulario va sin él (la API sigue
  // teniendo límite por IP y la trampa para robots). Para el VPS de pruebas
  // vale la clave de prueba de Cloudflare: 1x00000000000000000000AA.
  TURNSTILE_SITEKEY: '',
}
