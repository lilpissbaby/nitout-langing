# nit out · landing (nitout.com)

La página de presentación de nit out. La app (lo que hoy es
`kedada.tenebrum.online`) pasa a `app.nitout.com`; esta landing va en
`nitout.com`.

**Dónde corre:**

| | Producción · `nitout.com` | Pruebas · `nitout.tenebrum.online` |
|---|---|---|
| Qué | Cloudflare Workers con archivos estáticos | Contenedor nginx en el VPS |
| Cabeceras | `public/_headers` | `nginx/cabeceras.conf` |
| Puerta a la API | `worker/index.js` | `nginx/landing.conf.template` |
| Cómo se sube | la CI, al hacer push a `main` | `git pull` + `docker compose up -d` |

Los dos sirven la misma carpeta `public/` y dejan pasar las mismas cuatro
rutas de la API. `scripts/comprobar.mjs` hace fallar la CI si las cabeceras
o las rutas de un sitio y del otro dejan de coincidir.

- **HTML, CSS y JS a pelo.** Sin frameworks, sin build y sin CDN. Fuentes,
  Leaflet e iconos se sirven desde aquí.
- **Mismo estilo que la app** (Pegatina). Manda `kedada/DISENO.md`; lo propio
  de la landing está en `DISENO.md`.
- **Ligera.** La primera carga son unos 240 KB sin comprimir (110 KB son las
  tres fuentes). Leaflet y las teselas del mapa, lo que más pesa, sólo se
  piden al bajar hasta el mapa.
- **Superficie mínima.** Sin cookies, sin analítica y sin sesión. A la API
  sólo llegan cuatro rutas, y el resto de `/api/` da 404 aquí.

---

## Qué hay

```
public/
  index.html            la página (sprite de iconos dentro, sin <script> ni style inline)
  404.html              «aquí no hay fiesta»
  css/landing.css       tokens de la app + piezas de la landing
  js/inicio.js          arranque: carga perezosa del mapa y de los planes
  js/config.js          lo único que cambia entre entornos (tiendas, Turnstile, ciudades)
  js/mapa.js            el mapa de muestra (Leaflet, pegatinas, ficha)
  js/ejemplo.js         fiestas DE EJEMPLO por ciudad (con la chapa «ejemplo»)
  js/planes.js          tarjetas de planes desde GET /api/planes
  js/contacto.js        formulario → POST /api/contacto (Turnstile opcional)
  js/logos.js           tira de logos (los de ejemplo NUNCA salen en nitout.com)
  js/despegar.js        el detalle de cursor: la pegatina se levanta hacia el ratón
  img/logos/*.svg       logos de ENTIDADES INVENTADAS (maqueta)
  og.png                imagen al compartir el enlace (1200×630)
  _headers              CSP y cabeceras en Cloudflare (Cloudflare lo lee y no lo sirve)
worker/
  index.js              el Worker de /api/*: deja pasar las 4 rutas a app.nitout.com
  index.test.mjs        sus pruebas (node --test worker/index.test.mjs)
wrangler.jsonc          configuración de Cloudflare (sin dominio: lo pone la CI)
.github/workflows/
  landing.yml           CI: verificar → desplegar → humo, y vuelta atrás si falla
nginx/
  landing.conf.template servidor + proxy de las 4 rutas de la API (VPS)
  cabeceras.conf        CSP y cabeceras en el VPS (las lee también dev.mjs)
  proxy-api.conf        cómo se reenvía a la API (sin cookies ni Authorization)
scripts/
  dev.mjs               servidor local con el mismo CSP; API de mentira si no le das una
  comprobar.mjs         comprobaciones estáticas (inline, CSP, rutas, iconos, logos)
  humo.mjs              prueba de humo contra un despliegue (o el local, con --local)
docker-compose.yml      nginx:1.27-alpine, sin puertos, en proxy_network (VPS)
```

## Lo que la landing pide a la API

| Ruta | Para qué | En Cloudflare (Worker) | En el VPS (nginx) |
|---|---|---|---|
| `GET /api/eventos` | El mapa «en directo» | Sin cookies, Origin ni `X-Forwarded-For` | Lo mismo; 5 por segundo por IP |
| `GET /api/planes` | Precios, anuncio y si hay pagos | Caché de 5 minutos en el borde | Caché de 5 minutos |
| `GET /api/imagenes/<id>` | Las fotos de las pegatinas | Caché de 30 días en el borde | Caché de 30 días |
| `POST /api/contacto` | El formulario | Sólo desde la propia web, JSON, 8 KB | Sólo POST, 8 KB, 6 por minuto por IP |

En Cloudflare, el Worker llama a `https://app.nitout.com/api/…`. Está en la
misma zona que `nitout.com`, así que la API sigue viendo la IP real de quien
visita (`CF-Connecting-IP`), y sus límites por IP funcionan igual.

El endpoint de contacto está en `api-fiestas` (`src/modulos/contacto/`), con
13 pruebas. El correo llega a `CORREO_CONTACTO` con «Responder» a quien
escribió, y no se guarda nada en la base.

## Decisiones

- **Logos de ejemplo.** Son entidades inventadas, dibujadas para la maqueta.
  `js/logos.js` no los pinta nunca en `nitout.com` ni en `www.nitout.com`: si no
  hay ningún logo de verdad, la sección no sale. Sin JS no sale nada. Para
  poner uno de verdad hace falta su SVG y su permiso por escrito (más abajo).
- **Fiestas de ejemplo.** El mapa enseña primero las reales. Si cerca hay menos
  de 5, pasa solo al ejemplo, y entonces lleva la chapa negra «ejemplo · estas
  fiestas no existen».
- **Tiendas.** Son pegatinas propias con «pronto en App Store / Google Play»,
  sin los logos de Apple ni de Google. Cuando las apps estén publicadas, se pone
  la URL en `js/config.js` y la insignia oficial (más abajo).
- **Sin geolocalización.** Se elige la ciudad. El `Permissions-Policy` lo
  prohíbe.
- **Buscadores.** En producción, `ROBOTS=all`; en pruebas, `noindex`. A
  diferencia de la app, la landing sí quiere salir en Google y en los
  asistentes que buscan en la web. Sólo se bloquean los escáneres conocidos.
- **Movimiento.** Lo único animado sin tocar nada es el pegado de las
  pegatinas al cargar y la tira de logos, que tiene «Pausar» y se para fuera
  de pantalla. Con movimiento reducido, nada se mueve.

---

## Probar en local

```bash
node scripts/dev.mjs
# → http://localhost:3001 con una API de mentira (planes y un contacto que siempre va bien)

API=http://localhost:8787 node scripts/dev.mjs
# → contra api-fiestas en local (npm run dev allí, con MODO_DEV)
```

En PowerShell: `$env:API = 'http://localhost:8787'; node scripts/dev.mjs`.

Mira la consola del navegador: cualquier aviso de CSP es un fallo.

Antes de subir algo, lo mismo que pasa la CI:
```bash
node scripts/comprobar.mjs
node --test worker/index.test.mjs
node scripts/humo.mjs http://127.0.0.1:3001 --local    # con dev.mjs arrancado
```

---

## Seguir paso a paso

### Parte 1 · El repo

1. La carpeta del escritorio se llama `nitout-langing`. Renómbrala a
   `nitout-landing` cuando quieras: dentro nada depende del nombre.
2. En GitHub, crea un repo **privado** `nitout-landing` (vacío, sin README).
3. En la carpeta:
   ```bash
   git init -b main
   git add .
   git commit -m "Landing de nit out"
   git remote add origin git@github.com:lilpissbaby/nitout-landing.git
   git push -u origin main
   ```

**✅ Comprueba:** en GitHub aparecen `public/`, `nginx/` y `docker-compose.yml`, y **no** aparece ningún `.env`.

### Parte 2 · VPS de pruebas (nitout.tenebrum.online)

**2.1 · DNS.** En Nominalia, añade `nitout.tenebrum.online` igual que tienes
`kedada.tenebrum.online` (mismo tipo de registro y mismo destino). El
certificado wildcard ya lo cubre.

**2.2 · El proxy del homelab.** En `infra/nginx/conf.d/`, copia el `.conf` de
kedada como `nitout-landing.conf` y cambia sólo dos cosas:
- `server_name nitout.tenebrum.online;`
- en `proxy_pass`, el contenedor: `http://nitout-landing:80`.

Recarga el proxy: `docker exec reverse_proxy nginx -t && docker exec reverse_proxy nginx -s reload`.

**2.3 · La landing:**
```bash
cd /opt/homelab/apps
git clone git@github.com:lilpissbaby/nitout-landing.git
cd nitout-landing
cp .env.example .env      # ya viene con lo del VPS de pruebas
docker compose up -d
docker exec nitout-landing nginx -t
```

**2.4 · La API** (en su carpeta). Añade al `.env`:
```
CORREO_CONTACTO=hola@nitout.com
ORIGEN_LANDING=https://nitout.tenebrum.online
TURNSTILE_SECRETO=1x0000000000000000000000000000000AA
```
La última es la clave de **prueba** de Cloudflare, que siempre pasa. Después:
`git pull && docker compose up -d --build`.

**2.5 · Turnstile en la landing** (opcional en pruebas). En
`public/js/config.js`, pon `TURNSTILE_SITEKEY: '1x00000000000000000000AA'` (la
de prueba). Sin clave, el formulario funciona igual, sin el widget.

**2.6 · El mapa.** La clave de CARTO está atada a los dominios que diste al
pedirla. En tu cuenta de CARTO, añade `nitout.tenebrum.online` y `nitout.com`.
Si no lo haces, el mapa sale igual, pero en gris con OSM.

**✅ Comprueba:**
```bash
node scripts/humo.mjs https://nitout.tenebrum.online
```
Tiene que acabar con «Todo en orden». Después abre la web, rellena el
formulario una vez y mira que el correo llega a `hola@`.

### Parte 3 · Producción en Cloudflare (nitout.com)

Va directa a `nitout.com`. Hoy ese nombre lo usa la app a través del túnel,
y Cloudflare no deja poner un Worker en un nombre que ya tiene un registro
CNAME. Por eso **el primer paso es mover la app**.

**3.1 · Mover la app a app.nitout.com.** Sigue la lista «La mudanza» de más
abajo. Lo mínimo para seguir:
1. En Cloudflare → Tunnels → `nitout-prod` → **Public hostnames**, añade `app`
   · `nitout.com` → **HTTP** · `kedada:80`.
2. Pon en el `.env` de la API `ORIGEN_WEB=https://app.nitout.com` y
   `GOOGLE_REDIRECT_URI=https://app.nitout.com/api/sesion/google/callback`.
   En Google Cloud, añade esas mismas direcciones.
3. En el túnel, **borra** la ruta de `nitout.com` (la de `www` puede quedarse:
   la regla de redirección a `nitout.com` va antes). En **DNS → Records**,
   comprueba que ya no hay ningún registro `nitout.com` (el CNAME del túnel).
   **No borres los MX ni los TXT.**

**✅ Comprueba:** `https://app.nitout.com` abre la app y puedes entrar con tu
cuenta. `https://nitout.com` da error (aún no hay nada): es lo esperado.

**3.2 · La API, para la landing.** En el `.env` de la API de producción:
```
CORREO_CONTACTO=hola@nitout.com
ORIGEN_LANDING=https://nitout.com
TURNSTILE_SECRETO=…            # la Secret Key del paso 3.6 (o déjalo para luego)
```
Después: `docker compose up -d --build`.

**3.3 · El token para la CI.** En Cloudflare → tu perfil → **API Tokens →
Create Token → plantilla «Edit Cloudflare Workers»**.
- **Account Resources:** sólo tu cuenta.
- **Zone Resources:** sólo `nitout.com`.
- Tiene que llevar **Workers** con permiso para **crear** Workers (Admin o
  «Workers Scripts: Edit») y **Zone → Workers Routes → Edit**. Sin el
  segundo no puede poner el dominio.

Copia el token: sólo se ve una vez. El **Account ID** está en **Workers &
Pages**, en la columna de la derecha.

**3.4 · GitHub.** En el repo → **Settings → Environments → New environment**,
con el nombre `produccion`. Dentro, en **Environment secrets**:
- `CLOUDFLARE_API_TOKEN` (el del paso 3.3)
- `CLOUDFLARE_ACCOUNT_ID`

No hace falta la variable `DOMINIO`: por defecto es `nitout.com`.

**3.5 · Primer despliegue.** Haz push a `main`, o lánzalo a mano desde
**Actions → CI · landing → Run workflow**. Verás tres pasos:
1. **verificar:** comprobaciones, pruebas del Worker y humo en local;
2. **desplegar:** `wrangler deploy --domain nitout.com`, que crea el Worker y
   el dominio con su certificado;
3. **humo:** `scripts/humo.mjs https://nitout.com --produccion`. Si falla y
   había una versión anterior, vuelve sola a ella.

**✅ Comprueba:** los tres en verde, y `https://nitout.com` enseña la landing.

**3.6 · Turnstile** (cuando quieras). En Cloudflare → **Turnstile → Add widget**:
dominio `nitout.com`, modo **Managed**.
- La **Site Key** va en `public/js/config.js` → `TURNSTILE_SITEKEY` (push y se despliega).
- La **Secret Key** va en el `.env` de la API (paso 3.2).

**3.7 · Ajustes de la zona que chocan con el CSP:**
- **Speed → Rocket Loader:** apagado (reescribe los `<script>`).
- **Analytics → Web Analytics:** sin la inyección automática para `nitout.com`.
  Las visitas se siguen viendo en la analítica de la zona.
- **Scrape Shield → Email Address Obfuscation:** puede quedarse. Su script es
  del mismo dominio y el CSP lo deja pasar.

**3.8 · Buscadores.** En Google Search Console, añade `https://nitout.com/sitemap.xml`.

**Si algo falla:**

| Qué ves | Qué pasa | Qué hacer |
|---|---|---|
| `desplegar` falla con «existing CNAME» o «already has externally managed DNS records» | Sigue el registro del túnel en `nitout.com` | Paso 3.1, punto 3 |
| `desplegar` falla con «Authentication error» o «No access» | Al token le falta un permiso | Paso 3.3: Workers (crear) y Workers Routes Edit en `nitout.com` |
| `humo` falla en `/api/planes` con 502 | El Worker no llega a `app.nitout.com` | Paso 3.1, punto 1 |
| `humo` falla en `POST /api/contacto` con 403 en vez de 400 | La API no conoce el origen de la landing | `ORIGEN_LANDING=https://nitout.com` (paso 3.2) |
| `humo` falla en `POST /api/contacto` con 501 | Falta `CORREO_CONTACTO` o el correo de la API | Paso 3.2 |
| Errores de CSP en la consola con `cdn-cgi` o `cloudflareinsights` | Un ajuste de la zona mete scripts | Paso 3.7 |

**Después:** cada push a `main` que toque algo que no sea un `.md` se
despliega solo. Un pull request sólo pasa las comprobaciones.

### La mudanza de la app a app.nitout.com

No es de este repo, pero va antes de la Parte 3:

- [ ] API: `ORIGEN_WEB=https://app.nitout.com`, `GOOGLE_REDIRECT_URI=https://app.nitout.com/api/sesion/google/callback`.
- [ ] Google Cloud: añadir `https://app.nitout.com` en orígenes y redirecciones del cliente web.
- [ ] Apple, cuando haya cuenta: Return URL con `app.nitout.com`.
- [ ] App de Android: la URL base pasa a `https://app.nitout.com`.
- [ ] Enlaces de los correos (códigos, entradas) y de Stripe: salen de `ORIGEN_WEB`. Comprueba uno de cada.
- [ ] CARTO: añadir `app.nitout.com` a la clave.
- [ ] Panel de admin y Uptime Kuma: `https://app.nitout.com/api/salud`.

### Logos de verdad

1. Pide a la organización su logo en SVG y **su permiso por escrito** para
   salir en «Organizan con nit out».
2. Guárdalo en `public/img/logos/` (monocromo en tinta `#161616`, sin
   `style=""` ni `<script>` dentro).
3. Añade una línea en `js/logos.js` **sin** `ejemplo: true`.
4. Cuando haya los suficientes, borra las líneas y los SVG de ejemplo.

### Tiendas

Cuando las apps estén publicadas:
1. Pon las URL en `js/config.js` → `TIENDAS` (sólo valen `apps.apple.com` y `play.google.com`).
2. Descarga las insignias oficiales: Apple Marketing Resources («Download on
   the App Store», en español) y Google Play Badges. Guárdalas en `public/img/`.
3. Cambia la pegatina de `index.html` por la insignia, respetando sus normas
   (tamaño mínimo y margen libre).

### Endurecer el contenedor (opcional)

Es lo mismo que está pendiente en kedada. En el VPS de pruebas, descomenta en
`docker-compose.yml` `read_only`, `tmpfs`, `cap_drop` y `cap_add`, y después:
`docker compose up -d && docker compose logs`. Si arranca y `humo.mjs` pasa,
déjalo así también en producción.
