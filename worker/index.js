/**
 * nit out · landing en Cloudflare (Workers con archivos estáticos).
 *
 * Los estáticos (public/) los sirve Cloudflare sin pasar por aquí: este
 * Worker sólo se ejecuta para /api/* (wrangler.jsonc → run_worker_first).
 * Hace lo mismo que el nginx del VPS: deja pasar a la API SÓLO las cuatro
 * rutas que usa la landing y contesta 404 a todo lo demás.
 *
 *   GET  /api/eventos          el mapa de muestra (anónimo, sin caché aquí: la API ya cachea)
 *   GET  /api/planes           los precios (caché de 5 min en el borde)
 *   GET  /api/imagenes/<id>    las fotos de las pegatinas (caché de 30 días)
 *   POST /api/contacto         el formulario (8 KB como mucho, sólo desde esta web)
 *
 * A la API no le llega nada del navegador salvo el cuerpo y, en el
 * formulario, el Origin ya comprobado: ni cookies, ni Authorization, ni un
 * X-Forwarded-For inventado. app.nitout.com está en la misma zona, así que
 * Cloudflare le pasa la IP real en CF-Connecting-IP (los límites por IP de
 * la API siguen funcionando).
 *
 * _headers no se aplica a lo que responde un Worker: las cabeceras de
 * seguridad de estas respuestas se ponen aquí.
 */

const MAX_CUERPO = 8 * 1024
const ESPERA_MS = 10_000

export const RUTAS = [
  { patron: /^\/api\/eventos$/, metodos: ['GET', 'HEAD'], conConsulta: true },
  { patron: /^\/api\/planes$/, metodos: ['GET', 'HEAD'], cacheSegundos: 300 },
  { patron: /^\/api\/imagenes\/[A-Za-z0-9_-]{1,80}$/, metodos: ['GET', 'HEAD'], cacheSegundos: 2_592_000 },
  { patron: /^\/api\/contacto$/, metodos: ['POST'], escritura: true },
]

/** Lo que se deja pasar de la respuesta de la API. Nada de Set-Cookie ni CORS. */
const CABECERAS_DE_LA_API = ['content-type', 'etag', 'last-modified', 'retry-after']

const SEGURIDAD = {
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; sandbox",
  'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex',
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    // Por si algún día cambia run_worker_first: lo que no es /api/ es estático.
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request)

    const ruta = RUTAS.find((r) => r.patron.test(url.pathname))
    if (!ruta) return error(404, 'no_encontrado', 'La landing no usa esa ruta')
    if (!ruta.metodos.includes(request.method)) {
      return error(405, 'metodo_no_permitido', 'Método no permitido', { Allow: ruta.metodos.join(', ') })
    }

    const destino = new URL(url.pathname, env.API_ORIGEN)
    if (ruta.conConsulta) destino.search = url.search

    const cabeceras = new Headers({ Accept: 'application/json', 'User-Agent': 'nitout-landing' })
    let cuerpo
    if (ruta.escritura) {
      // El formulario sólo vale desde esta misma web. Un navegador siempre
      // manda Origin en un POST; sin él (curl, otro servidor), fuera.
      const origen = request.headers.get('Origin')
      if (origen !== url.origin) return error(403, 'sin_permiso', 'Petición desde un origen no permitido')
      if (!(request.headers.get('Content-Type') ?? '').startsWith('application/json')) {
        return error(415, 'tipo_no_soportado', 'El formulario va en JSON')
      }
      if (Number(request.headers.get('Content-Length') ?? 0) > MAX_CUERPO) return error(413, 'demasiado_grande', 'El mensaje es demasiado largo')
      cuerpo = await request.arrayBuffer()
      if (cuerpo.byteLength > MAX_CUERPO) return error(413, 'demasiado_grande', 'El mensaje es demasiado largo')
      cabeceras.set('Content-Type', 'application/json')
      // La API comprueba que es ORIGEN_LANDING (su .env): https://nitout.com.
      cabeceras.set('Origin', url.origin)
    }

    let respuesta
    try {
      respuesta = await fetch(destino, {
        method: request.method,
        headers: cabeceras,
        body: cuerpo,
        redirect: 'manual',
        signal: AbortSignal.timeout(ESPERA_MS),
        ...(ruta.cacheSegundos ? { cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': ruta.cacheSegundos, 404: 60, '500-599': 0 } } } : {}),
      })
    } catch {
      return error(502, 'sin_api', 'La API no responde. Vuelve a intentarlo en un momento.')
    }

    // Una redirección de la API no se sigue ni se enseña: no hay ninguna esperada.
    if (respuesta.status >= 300 && respuesta.status < 400) return error(502, 'sin_api', 'Respuesta inesperada de la API')

    const salida = new Headers(SEGURIDAD)
    for (const nombre of CABECERAS_DE_LA_API) {
      const valor = respuesta.headers.get(nombre)
      if (valor) salida.set(nombre, valor)
    }
    salida.set('Cache-Control', ruta.cacheSegundos && respuesta.ok ? `public, max-age=${Math.min(ruta.cacheSegundos, 86_400)}` : 'no-store')
    return new Response(request.method === 'HEAD' ? null : respuesta.body, { status: respuesta.status, headers: salida })
  },
}

function error(estado, codigo, mensaje, extra = {}) {
  return new Response(JSON.stringify({ error: { codigo, mensaje } }), {
    status: estado,
    headers: { ...SEGURIDAD, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  })
}
