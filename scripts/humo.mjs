#!/usr/bin/env node
/**
 * Prueba de humo de la landing. Cero dependencias (Node 18+).
 *
 *   node scripts/humo.mjs https://nitout.com --produccion       Cloudflare (o el VPS de producción)
 *   node scripts/humo.mjs https://nitout.tenebrum.online        VPS de pruebas
 *   node scripts/humo.mjs http://127.0.0.1:3001 --local         scripts/dev.mjs (lo usa la CI)
 *
 * Comprueba lo que no se ve a simple vista: cabeceras de seguridad, que a la
 * API sólo llegan las cuatro rutas de la landing, que los enlaces llevan a la
 * app correcta y que en pruebas no se indexa. No manda ningún correo: al
 * formulario le manda datos mal a propósito (tiene que contestar 400).
 */

const base = process.argv[2]?.replace(/\/+$/, '')
const produccion = process.argv.includes('--produccion')
const local = process.argv.includes('--local')
if (!base) {
  console.error('Uso: node scripts/humo.mjs <url> [--produccion | --local]')
  process.exit(2)
}

let fallos = 0
const ok = (texto) => console.log(`  ✓ ${texto}`)
const mal = (texto) => {
  fallos++
  console.log(`  ✗ ${texto}`)
}
const comprobar = (cond, texto, detalle = '') => (cond ? ok(texto) : mal(`${texto}${detalle !== '' ? ` (${detalle})` : ''}`))
const pedir = (ruta, opciones = {}) => fetch(base + ruta, { redirect: 'manual', ...opciones })
const origen = new URL(base).origin

console.log(`\nLanding en ${base}${produccion ? ' (producción)' : local ? ' (local)' : ' (pruebas)'}\n`)

// 1 · La página y sus cabeceras
const r = await pedir('/')
const html = await r.text()
comprobar(r.status === 200, 'GET / responde 200', r.status)
const csp = r.headers.get('content-security-policy') ?? ''
comprobar(csp.includes("default-src 'none'"), 'CSP presente y cerrada por defecto')
comprobar(!csp.includes('unsafe-inline') && !csp.includes('unsafe-eval'), 'CSP sin unsafe-inline ni unsafe-eval')
comprobar(r.headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff')
comprobar((r.headers.get('x-frame-options') ?? '').toUpperCase() === 'DENY', 'X-Frame-Options: DENY')
comprobar(!/\d/.test(r.headers.get('server') ?? ''), 'el servidor no enseña su versión', r.headers.get('server'))
if (!local) comprobar(/max-age=\d+/.test(r.headers.get('strict-transport-security') ?? ''), 'HSTS presente')

const robots = r.headers.get('x-robots-tag') ?? ''
if (produccion) comprobar(!robots.includes('noindex'), 'Producción: los buscadores pueden indexar', robots || '(sin X-Robots-Tag)')
else if (!local) comprobar(robots.includes('noindex'), 'Pruebas: X-Robots-Tag noindex', robots)

const enlaces = new Set([...html.matchAll(/href="(https:\/\/[^"/]+)\/"/g)].map((m) => m[1]).filter((u) => u !== 'https://nitout.com'))
console.log(`    «Abrir el mapa» lleva a: ${[...enlaces].join(', ') || '(ninguno)'}`)
if (produccion) comprobar(html.includes('href="https://app.nitout.com/"'), 'Producción: los enlaces llevan a app.nitout.com')
else if (!local) comprobar(!html.includes('href="https://app.nitout.com/"'), 'Pruebas: los enlaces NO llevan a producción (APP_URL)')

// 2 · Lo que la landing sí pide a la API
const planes = await pedir('/api/planes')
const datosPlanes = await planes.json().catch(() => null)
comprobar(planes.status === 200 && Array.isArray(datosPlanes?.planes), 'GET /api/planes trae los planes', planes.status)
const eventos = await pedir('/api/eventos?lat=41.1561&lng=1.1069&r=2000&limite=5')
comprobar(eventos.status === 200, 'GET /api/eventos responde 200', eventos.status)
comprobar(!eventos.headers.get('set-cookie'), 'la API no pone cookies a través de la landing')
comprobar(eventos.headers.get('x-content-type-options') === 'nosniff', 'las respuestas de la API llevan nosniff')

const contacto = await pedir('/api/contacto', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: origen },
  body: JSON.stringify({ nombre: '' }),
})
comprobar(contacto.status === 400, 'POST /api/contacto llega a la API y valida (400 con datos mal)', contacto.status)
const ajeno = await pedir('/api/contacto', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://otra-web.example' },
  body: JSON.stringify({ nombre: '' }),
})
comprobar(ajeno.status === 403, 'POST /api/contacto desde otra web: 403', ajeno.status)

// 3 · Lo que NO tiene que pasar
for (const ruta of ['/api/sesion', '/api/usuarios/yo', '/api/org/yo', '/api/salud']) {
  const x = await pedir(ruta)
  comprobar(x.status === 404, `GET ${ruta} cerrado en la landing (404)`, x.status)
}
const crear = await pedir('/api/eventos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
comprobar([403, 404, 405].includes(crear.status), 'POST /api/eventos rechazado (sólo lectura)', crear.status)
const subir = await pedir('/', { method: 'POST' })
comprobar(subir.status >= 400 && subir.status < 500, 'POST / rechazado', subir.status)

for (const ruta of ['/_headers', '/.env', '/.git/config', '/wp-login.php']) {
  try {
    const x = await pedir(ruta)
    comprobar(x.status >= 400, `${ruta} no se sirve`, x.status)
  } catch {
    ok(`${ruta} corta la conexión (444)`)
  }
}
const noExiste = await pedir('/esto-no-existe')
comprobar(noExiste.status === 404 && (await noExiste.text()).includes('aquí no'), 'página 404 propia', noExiste.status)

// 4 · Estáticos
const config = await (await pedir('/js/config.js')).text()
comprobar(config.includes('APP_URL'), 'js/config.js se sirve')
if (!local) {
  const fuente = await pedir('/fonts/nitout-rotulo-bold.woff2')
  comprobar(fuente.status === 200 && (fuente.headers.get('cache-control') ?? '').includes('immutable'), 'fuentes con caché larga', fuente.headers.get('cache-control'))
}
const og = await pedir('/og.png')
comprobar(og.status === 200, 'imagen para compartir (og.png)')

console.log(fallos ? `\n${fallos} comprobación(es) han fallado.\n` : '\nTodo en orden.\n')
process.exit(fallos ? 1 : 0)
