#!/usr/bin/env node
/**
 * Comprobaciones estáticas de la landing. Cero dependencias (Node 18+).
 * Las pasa la CI en cada pull request y antes de desplegar:
 *
 *   node scripts/comprobar.mjs
 *
 * Lo que mira es lo que rompería el CSP, la seguridad o el estilo sin que
 * se note al abrir la página en local:
 *   - nada de style="", on*="", <style> ni <script> inline en el HTML;
 *   - el CSP sin unsafe-inline ni unsafe-eval, e IGUAL en nginx y en Cloudflare;
 *   - las cuatro rutas de la API, las mismas en nginx, en el Worker y en dev.mjs;
 *   - todos los iconos que se usan existen en el sprite;
 *   - los logos de ejemplo siguen sin poder salir en nitout.com.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const leer = (ruta) => readFileSync(join(RAIZ, ruta), 'utf8')
let fallos = 0
const ok = (t) => console.log(`  ✓ ${t}`)
const mal = (t) => {
  fallos++
  console.log(`  ✗ ${t}`)
}
const comprobar = (cond, t) => (cond ? ok(t) : mal(t))

console.log('\nComprobaciones de la landing\n')

// 1 · HTML sin nada inline que el CSP bloquearía
for (const fichero of ['public/index.html', 'public/404.html']) {
  const html = leer(fichero)
  comprobar(!/\sstyle\s*=/i.test(html), `${fichero}: sin style=""`)
  comprobar(!/\son[a-z]+\s*=/i.test(html), `${fichero}: sin on*="" (onclick, onerror…)`)
  comprobar(!/<style[\s>]/i.test(html), `${fichero}: sin <style>`)
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  const inline = scripts.filter(([, attrs, cuerpo]) => cuerpo.trim() && !/type="application\/ld\+json"/.test(attrs))
  comprobar(inline.length === 0, `${fichero}: sin <script> inline (salvo los datos JSON-LD)`)
  for (const [, , cuerpo] of scripts.filter(([, attrs]) => /application\/ld\+json/.test(attrs))) {
    try {
      JSON.parse(cuerpo)
      ok(`${fichero}: el JSON-LD es JSON válido`)
    } catch (e) {
      mal(`${fichero}: el JSON-LD no es JSON válido (${e.message})`)
    }
  }
  const srcFuera = [...html.matchAll(/\ssrc="(https?:\/\/[^"]+)"/g)].map((m) => m[1])
  comprobar(srcFuera.length === 0, `${fichero}: ningún src a otro dominio${srcFuera.length ? ` (${srcFuera.join(', ')})` : ''}`)
}

// 2 · JS: nada de lo que el CSP o el escape por defecto no cubren
const ficherosJs = readdirSync(join(RAIZ, 'public/js')).filter((f) => f.endsWith('.js'))
for (const f of ficherosJs) {
  const js = leer(`public/js/${f}`)
  if (/setAttribute\(\s*['"]style['"]/.test(js)) mal(`js/${f}: setAttribute('style') (el CSP lo bloquea: usa style.setProperty)`)
  if (/\beval\s*\(|new Function\s*\(/.test(js)) mal(`js/${f}: eval o new Function`)
  if (/\.innerHTML\s*=/.test(js) && f !== 'util.js') mal(`js/${f}: innerHTML directo (usa pintar() con la plantilla html de util.js)`)
  if (/\.(insertAdjacentHTML|outerHTML)\s*[(=]/.test(js)) mal(`js/${f}: insertAdjacentHTML/outerHTML`)
}
ok(`js/: sin eval, sin innerHTML fuera de util.js, sin style por atributo (${ficherosJs.length} ficheros)`)

// 3 · CSP y cabeceras: iguales en nginx (VPS) y en Cloudflare (_headers)
const nginx = {}
for (const m of leer('nginx/cabeceras.conf').matchAll(/^\s*add_header\s+([\w-]+)\s+"([^"]*)"/gm)) nginx[m[1].toLowerCase()] = m[2]
const cloudflare = {}
{
  const texto = leer('public/_headers')
  const bloque = texto.split(/^\/\*\s*$/m)[1]?.split(/^\S/m)[0] ?? ''
  for (const m of bloque.matchAll(/^\s+([\w-]+):\s*(.+?)\s*$/gm)) cloudflare[m[1].toLowerCase()] = m[2]
}
const csp = nginx['content-security-policy'] ?? ''
comprobar(csp.length > 0, 'nginx: hay CSP')
comprobar(!/unsafe-inline|unsafe-eval/.test(csp), 'CSP sin unsafe-inline ni unsafe-eval')
const nombres = new Set([...Object.keys(nginx), ...Object.keys(cloudflare)])
const distintas = [...nombres].filter((n) => nginx[n] !== cloudflare[n])
comprobar(distintas.length === 0, `nginx/cabeceras.conf y public/_headers dicen lo mismo${distintas.length ? ` (distinto: ${distintas.join(', ')})` : ''}`)

// 4 · Las cuatro rutas de la API, en los tres sitios que las dejan pasar
const RUTAS = ['/api/eventos', '/api/planes', '/api/imagenes', '/api/contacto']
const sitios = {
  'nginx/landing.conf.template': leer('nginx/landing.conf.template'),
  'worker/index.js': leer('worker/index.js').replaceAll('\\/', '/'),
  'scripts/dev.mjs': leer('scripts/dev.mjs').replaceAll('\\/', '/'),
}
for (const [fichero, texto] of Object.entries(sitios)) {
  const faltan = RUTAS.filter((r) => !texto.includes(r))
  comprobar(faltan.length === 0, `${fichero}: deja pasar las 4 rutas${faltan.length ? ` (faltan ${faltan.join(', ')})` : ''}`)
}
const pedidas = new Set()
for (const f of ficherosJs) for (const m of leer(`public/js/${f}`).matchAll(/fetch\(\s*[`'"](\/api\/[a-z]+)/g)) pedidas.add(m[1])
const sinPermiso = [...pedidas].filter((r) => !RUTAS.includes(r))
comprobar(sinPermiso.length === 0, `el JS sólo pide esas rutas${sinPermiso.length ? ` (pide también ${sinPermiso.join(', ')})` : ''}`)

// 5 · Iconos: todo lo que se usa existe en el sprite
const index = leer('public/index.html')
const simbolos = new Set([...index.matchAll(/<symbol id="([\w-]+)"/g)].map((m) => m[1]))
const usados = new Set()
for (const m of index.matchAll(/href="#([\w-]+)"/g)) if (m[1].startsWith('i-')) usados.add(m[1])
for (const f of ficherosJs) for (const m of leer(`public/js/${f}`).matchAll(/['"`#](i-[a-z][\w-]*)['"`]/g)) usados.add(m[1])
const faltanIconos = [...usados].filter((i) => !simbolos.has(i))
comprobar(faltanIconos.length === 0, `iconos: los ${usados.size} que se usan están en el sprite${faltanIconos.length ? ` (faltan ${faltanIconos.join(', ')})` : ''}`)

// 6 · Logos de ejemplo: nunca en producción
const config = leer('public/js/config.js')
const logos = leer('public/js/logos.js')
comprobar(/DOMINIOS_PRODUCCION:\s*\[[^\]]*'nitout\.com'/.test(config), 'config.js: nitout.com está en DOMINIOS_PRODUCCION')
comprobar(/enProduccion\(\)\s*\?\s*LOGOS\.filter\(\(l\)\s*=>\s*!l\.ejemplo\)/.test(logos), 'logos.js: en producción se quitan los de ejemplo')

console.log(fallos ? `\n${fallos} comprobación(es) han fallado.\n` : '\nTodo en orden.\n')
process.exit(fallos ? 1 : 0)
