# Para agentes (Claude, Codex…)

Landing de nit out (`nitout.com`). Antes de tocar CSS, HTML, JS de interfaz,
iconos, letras o textos:

1. **Lee la skill `nitout-diseno`** (en la cuenta, o en `kedada/.agents/skills/nitout-diseno/SKILL.md`).
2. **Lee `kedada/DISENO.md`** (manda) y `DISENO.md` de este repo (lo propio de la landing).
3. Si existe la skill `nitout-landing`, también.

Reglas que no se negocian:

- HTML + CSS + JS con módulos ES nativos. Sin frameworks, sin build y sin CDN.
- CSP sin `unsafe-inline` (`nginx/cabeceras.conf`). Nada de `style=""`, `on*=""`
  ni `<script>`/`<style>` inline. Los valores calculados van por
  `el.style.setProperty('--x', …)`.
- Todo HTML generado pasa por la plantilla `html` de `js/util.js` (escapa por defecto).
- A la API sólo van `GET /api/eventos`, `GET /api/planes`, `GET /api/imagenes/<id>`
  y `POST /api/contacto`. Una ruta nueva se añade a la vez en
  `nginx/landing.conf.template`, `scripts/dev.mjs` y `scripts/humo.mjs`.
- Los logos de `js/logos.js` con `ejemplo: true` no salen nunca en producción.
  No se añade el logo de nadie sin su permiso.
- Prueba con `node scripts/dev.mjs` a 390×844 y a 1440×900, en claro y oscuro.
  Cualquier aviso de CSP en la consola es un fallo.
- No ejecutes `git` desde el puente al ordenador del usuario: deja `.git/index.lock`.
