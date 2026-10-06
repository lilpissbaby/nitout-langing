/**
 * El Worker de la landing: que sólo deja pasar las cuatro rutas, que no le
 * llega a la API nada del navegador que no deba y que el formulario sólo vale
 * desde la propia web. Sin dependencias: node --test worker/
 */
import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import worker from './index.js'

const env = {
  API_ORIGEN: 'https://app.nitout.test',
  ASSETS: { fetch: async () => new Response('estático', { status: 200 }) },
}

let llamadas
const fetchOriginal = globalThis.fetch
beforeEach(() => {
  llamadas = []
  globalThis.fetch = async (url, init) => {
    llamadas.push({ url: String(url), init })
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'sesion=robada', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
afterEach(() => {
  globalThis.fetch = fetchOriginal
})

const pedir = (ruta, init = {}) => worker.fetch(new Request(`https://nitout.test${ruta}`, init), env)

describe('Worker de la landing', () => {
  it('GET /api/eventos pasa con su consulta y sin nada del navegador', async () => {
    const r = await pedir('/api/eventos?lat=41.1&lng=1.1&r=6000', {
      headers: { Cookie: 'sesion=x', Authorization: 'Bearer x', 'X-Forwarded-For': '1.2.3.4', Origin: 'https://nitout.test' },
    })
    assert.equal(r.status, 200)
    assert.equal(llamadas.length, 1)
    assert.equal(llamadas[0].url, 'https://app.nitout.test/api/eventos?lat=41.1&lng=1.1&r=6000')
    const h = llamadas[0].init.headers
    for (const nombre of ['cookie', 'authorization', 'x-forwarded-for', 'origin']) assert.equal(h.get(nombre), null, nombre)
    assert.equal(r.headers.get('set-cookie'), null, 'la cookie de la API no llega al navegador')
    assert.equal(r.headers.get('access-control-allow-origin'), null)
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(r.headers.get('cache-control'), 'no-store')
  })

  it('planes e imágenes se cachean en el borde; la consulta no viaja', async () => {
    await pedir('/api/planes?colar=1')
    assert.equal(llamadas[0].url, 'https://app.nitout.test/api/planes')
    assert.equal(llamadas[0].init.cf.cacheTtlByStatus['200-299'], 300)
    const img = await pedir('/api/imagenes/abc123-mini')
    assert.equal(llamadas[1].init.cf.cacheTtlByStatus['200-299'], 2_592_000)
    assert.match(img.headers.get('cache-control'), /^public, max-age=86400$/)
  })

  it('el resto de la API no existe aquí: 404 sin preguntar a la API', async () => {
    for (const ruta of ['/api/sesion', '/api/usuarios/yo', '/api/org/yo', '/api/imagenes/../sesion', '/api/imagenes/a/b', '/api/eventos/123']) {
      const r = await pedir(ruta)
      assert.equal(r.status, 404, ruta)
    }
    assert.equal(llamadas.length, 0)
  })

  it('sólo lectura donde toca: POST a eventos y GET a contacto, 405', async () => {
    assert.equal((await pedir('/api/eventos', { method: 'POST', body: '{}' })).status, 405)
    assert.equal((await pedir('/api/contacto')).status, 405)
    assert.equal(llamadas.length, 0)
  })

  it('el formulario pasa desde la propia web, con el Origin comprobado', async () => {
    const r = await pedir('/api/contacto', {
      method: 'POST',
      headers: { Origin: 'https://nitout.test', 'Content-Type': 'application/json', Cookie: 'x=1' },
      body: JSON.stringify({ nombre: 'Marta' }),
    })
    assert.equal(r.status, 200)
    const h = llamadas[0].init.headers
    assert.equal(h.get('origin'), 'https://nitout.test')
    assert.equal(h.get('content-type'), 'application/json')
    assert.equal(h.get('cookie'), null)
    assert.equal(new TextDecoder().decode(llamadas[0].init.body), '{"nombre":"Marta"}')
  })

  it('el formulario desde otra web, sin Origin, sin JSON o demasiado grande: fuera', async () => {
    const json = { 'Content-Type': 'application/json' }
    assert.equal((await pedir('/api/contacto', { method: 'POST', headers: { ...json, Origin: 'https://malo.test' }, body: '{}' })).status, 403)
    assert.equal((await pedir('/api/contacto', { method: 'POST', headers: json, body: '{}' })).status, 403)
    assert.equal((await pedir('/api/contacto', { method: 'POST', headers: { Origin: 'https://nitout.test', 'Content-Type': 'text/plain' }, body: '{}' })).status, 415)
    const grande = JSON.stringify({ mensaje: 'x'.repeat(9000) })
    assert.equal((await pedir('/api/contacto', { method: 'POST', headers: { ...json, Origin: 'https://nitout.test' }, body: grande })).status, 413)
    assert.equal(llamadas.length, 0)
  })

  it('si la API no contesta: 502 con un mensaje para personas', async () => {
    globalThis.fetch = async () => {
      throw new Error('timeout')
    }
    const r = await pedir('/api/planes')
    assert.equal(r.status, 502)
    assert.equal((await r.json()).error.codigo, 'sin_api')
  })

  it('una redirección de la API no se sigue ni se enseña', async () => {
    globalThis.fetch = async () => new Response(null, { status: 302, headers: { Location: 'https://malo.test' } })
    const r = await pedir('/api/planes')
    assert.equal(r.status, 502)
    assert.equal(r.headers.get('location'), null)
  })

  it('lo que no es /api/ va a los estáticos', async () => {
    const r = await pedir('/')
    assert.equal(await r.text(), 'estático')
    assert.equal(llamadas.length, 0)
  })
})
