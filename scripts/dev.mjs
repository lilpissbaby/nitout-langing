#!/usr/bin/env node
/**
 * Servidor de desarrollo de la landing. Cero dependencias: sólo Node 18+.
 *
 *   node scripts/dev.mjs                       # http://localhost:3001, API de mentira
 *   API=http://localhost:8787 node scripts/dev.mjs    # contra api-fiestas en local
 *   API=https://kedada.tenebrum.online node scripts/dev.mjs   # sólo lectura contra el VPS
 *
 * Hace lo mismo que nginx en el VPS:
 *   - sirve public/ con las MISMAS cabeceras (las lee de nginx/cabeceras.conf):
 *     si algo rompe el CSP, se ve aquí en la consola del navegador;
 *   - cambia https://app.nitout.com por APP_URL en el HTML y el JS;
 *   - reenvía SÓLO GET /api/eventos, GET /api/planes, GET /api/imagenes/… y
 *     POST /api/contacto; lo demás de /api/ es 404.
 *
 * Sin la variable API responde con datos de mentira (planes del arranque de
 * la API, cero fiestas reales y un contacto que siempre va bien), para
 * trabajar el diseño sin levantar nada más.
 *
 * En PowerShell: $env:API = 'http://localhost:8787'; node scripts/dev.mjs
 */

import http from 'node:http'
import https from 'node:https'
import { readFile, stat } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { extname, join, normalize, resolve, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLICO = join(RAIZ, 'public')
const PUERTO = Number(process.env.PUERTO ?? 3001)
const API = process.env.API ? new URL(process.env.API) : null
const APP_URL = process.env.APP_URL ?? 'https://app.nitout.com'

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
}

/** Las cabeceras de nginx/cabeceras.conf, para no mantenerlas en dos sitios. */
function leerCabeceras() {
  const conf = readFileSync(join(RAIZ, 'nginx', 'cabeceras.conf'), 'utf8')
  const cabeceras = {}
  for (const m of conf.matchAll(/^\s*add_header\s+([\w-]+)\s+"([^"]*)"/gm)) cabeceras[m[1]] = m[2]
  // En local no hay https: HSTS y upgrade-insecure-requests romperían localhost.
  delete cabeceras['Strict-Transport-Security']
  cabeceras['Content-Security-Policy'] = cabeceras['Content-Security-Policy'].replace(/;\s*upgrade-insecure-requests/, '')
  cabeceras['X-Robots-Tag'] = 'noindex, nofollow'
  return cabeceras
}
const SEGURIDAD = leerCabeceras()

async function servirEstatico(req, res) {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  // Como Cloudflare y nginx: ni _headers ni ficheros ocultos.
  if (ruta === '/_headers' || /\/\./.test(ruta)) return no404(res)
  let fichero = normalize(join(PUBLICO, ruta))
  if (fichero !== PUBLICO && !fichero.startsWith(PUBLICO + sep)) return responder(res, 403, 'Fuera de public/')
  try {
    const info = await stat(fichero)
    if (info.isDirectory()) fichero = join(fichero, 'index.html')
    let cuerpo = await readFile(fichero)
    const ext = extname(fichero)
    if (ext === '.html' || ext === '.js') cuerpo = Buffer.from(cuerpo.toString('utf8').replaceAll('https://app.nitout.com', APP_URL))
    res.writeHead(200, { ...SEGURIDAD, 'Content-Type': TIPOS[ext] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' })
    res.end(req.method === 'HEAD' ? undefined : cuerpo)
  } catch {
    return no404(res)
  }
}

async function no404(res) {
  const cuerpo = await readFile(join(PUBLICO, '404.html')).catch(() => 'No encontrado')
  res.writeHead(404, { ...SEGURIDAD, 'Content-Type': TIPOS['.html'] })
  res.end(cuerpo)
}

/* ---------------- la API: lo mismo que deja pasar nginx ---------------- */

const RUTAS_API = [
  { metodo: 'GET', patron: /^\/api\/eventos$/ },
  { metodo: 'GET', patron: /^\/api\/planes$/ },
  { metodo: 'GET', patron: /^\/api\/imagenes\/[A-Za-z0-9_-]{1,80}$/ },
  { metodo: 'POST', patron: /^\/api\/contacto$/ },
]

function rutaPermitida(req) {
  const ruta = new URL(req.url, 'http://x').pathname
  return RUTAS_API.some((r) => (r.metodo === req.method || (r.metodo === 'GET' && req.method === 'HEAD')) && r.patron.test(ruta))
}

function reenviarApi(req, res) {
  const destino = new URL(req.url, API)
  const cliente = destino.protocol === 'https:' ? https : http
  const cabeceras = {
    'content-type': req.headers['content-type'] ?? 'application/json',
    accept: 'application/json',
    host: API.host,
    'x-forwarded-for': req.socket.remoteAddress,
  }
  // Como nginx: Origin sólo en el formulario (la API lo comprueba).
  if (req.method === 'POST' && req.headers.origin) cabeceras.origin = req.headers.origin
  const salida = cliente.request(destino, { method: req.method, headers: cabeceras }, (r) => {
    const { 'set-cookie': _c, ...resto } = r.headers
    res.writeHead(r.statusCode ?? 502, { ...resto, ...SEGURIDAD })
    r.pipe(res)
  })
  salida.on('error', (err) => {
    console.error(`  ✗ API en ${API.origin} no responde (${err.code}).`)
    responder(res, 502, JSON.stringify({ error: { codigo: 'sin_api', mensaje: `No hay API en ${API.origin}` } }), 'application/json')
  })
  req.pipe(salida)
}

/** Sin API: respuestas de mentira con la misma forma que las de verdad. */
async function apiDeMentira(req, res) {
  const ruta = new URL(req.url, 'http://x').pathname
  const json = (estado, cuerpo) => {
    res.writeHead(estado, { ...SEGURIDAD, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(cuerpo))
  }
  if (ruta === '/api/eventos') return json(200, { eventos: [], centro: [0, 0], radio: 6000 })
  if (ruta === '/api/planes') {
    return json(200, {
      planes: [
        { id: 'basico', nombre: 'Básico', precioMensual: 20, fiestasALaVez: 1, fiestasAlMes: 10, fotosPorFiesta: 1, reciclar: false, comisionBps: 300 },
        { id: 'medio', nombre: 'Medio', precioMensual: 50, fiestasALaVez: 3, fiestasAlMes: 30, fotosPorFiesta: 5, reciclar: false, comisionBps: 250 },
        { id: 'alto', nombre: 'Alto', precioMensual: 100, fiestasALaVez: 10, fiestasAlMes: 100, fotosPorFiesta: 10, reciclar: true, comisionBps: 150 },
      ],
      anuncio: { precioCent: 7500 },
      contacto: 'hola@nitout.com',
      pagos: false,
    })
  }
  if (ruta === '/api/contacto') {
    let cuerpo = ''
    for await (const trozo of req) cuerpo += trozo
    await new Promise((r) => setTimeout(r, 500))
    try {
      const datos = JSON.parse(cuerpo)
      if (!datos.correo?.includes('@')) {
        return json(400, { error: { codigo: 'datos_invalidos', mensaje: 'Revisa los campos marcados', detalles: [{ campo: 'correo', problema: 'Escribe un correo válido' }] } })
      }
      console.log('  ✉ contacto de mentira:', datos.organizacion, `<${datos.correo}>`)
      return json(201, { ok: true })
    } catch {
      return json(400, { error: { codigo: 'datos_invalidos', mensaje: 'Cuerpo incorrecto' } })
    }
  }
  return json(404, { error: { codigo: 'no_encontrado', mensaje: 'No hay nada aquí' } })
}

function responder(res, estado, texto, tipo = 'text/plain; charset=utf-8') {
  res.writeHead(estado, { ...SEGURIDAD, 'Content-Type': tipo })
  res.end(texto)
}

http
  .createServer((req, res) => {
    const inicio = Date.now()
    res.on('finish', () => {
      if (req.url.startsWith('/api/')) console.log(`  ${req.method.padEnd(6)} ${res.statusCode} ${req.url.slice(0, 90)} ${Date.now() - inicio}ms`)
    })
    if (req.url.startsWith('/api/')) {
      if (!rutaPermitida(req)) return responder(res, 404, JSON.stringify({ error: { codigo: 'no_encontrado', mensaje: 'La landing no usa esa ruta' } }), 'application/json')
      // Como el Worker: el formulario sólo desde esta misma web.
      if (req.method === 'POST' && req.headers.origin !== `http://${req.headers.host}`) {
        return responder(res, 403, JSON.stringify({ error: { codigo: 'sin_permiso', mensaje: 'Petición desde un origen no permitido' } }), 'application/json')
      }
      return API ? reenviarApi(req, res) : apiDeMentira(req, res)
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return responder(res, 405, 'Sólo GET')
    return servirEstatico(req, res)
  })
  .listen(PUERTO, () => {
    console.log(`\n  landing de nit out en http://localhost:${PUERTO}`)
    console.log(API ? `  API       ${API.origin}` : '  API       de mentira (pon API=… para usar una de verdad)')
    console.log(`  APP_URL   ${APP_URL}\n`)
  })
