# nit out · landing (nitout.com)

La página de presentación de nit out. La app (lo que hoy es
`kedada.tenebrum.online`) pasa a `app.nitout.com`; esta landing va en
`nitout.com`.

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
nginx/
  landing.conf.template servidor + proxy de las 4 rutas de la API
  cabeceras.conf        CSP y cabeceras de seguridad (las lee también dev.mjs)
  proxy-api.conf        cómo se reenvía a la API (sin cookies ni Authorization)
scripts/
  dev.mjs               servidor local con el mismo CSP; API de mentira si no le das una
  humo.mjs              prueba de humo contra un despliegue
docker-compose.yml      nginx:1.27-alpine, sin puertos, en proxy_network
```

## Lo que la landing pide a la API

| Ruta | Para qué | En nginx |
|---|---|---|
| `GET /api/eventos` | El mapa «en directo» | Sin cookies ni Origin; 5 por segundo por IP |
| `GET /api/planes` | Precios, anuncio y si hay pagos | Caché de 5 minutos |
| `GET /api/imagenes/<id>` | Las fotos de las pegatinas | Caché de 30 días |
| `POST /api/contacto` | El formulario | Sólo POST, 8 KB, 6 por minuto por IP |

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

### Parte 3 · Producción (nitout.com)

> Ojo: hoy el túnel manda `nitout.com` a la app (`kedada:80`). Esta parte
> mueve la app a `app.nitout.com`, así que hay que hacer **a la vez** la
> mudanza de la app (lista de abajo). Si no, se rompe el login.

1. En el VPS de producción, clona el repo en `/opt/nitout/nitout-landing`, con
   su propia deploy key de **sólo lectura** (como en la Parte 10.1 de
   `produccion-paso-a-paso.md`).
2. `.env`:
   ```
   API_UPSTREAM=api-fiestas:8787
   API_ESQUEMA=http
   APP_URL=https://app.nitout.com
   ROBOTS=all
   ```
   Después: `docker compose up -d`.
3. En Cloudflare → Tunnels → `nitout-prod` → **Public hostnames**:

   | Subdomain | Domain | Service |
   |---|---|---|
   | *(vacío)* | `nitout.com` | **HTTP** · `nitout-landing:80` |
   | `www` | `nitout.com` | **HTTP** · `nitout-landing:80` |
   | `app` | `nitout.com` | **HTTP** · `kedada:80` |

   La regla de `www` → `nitout.com` que ya tienes se queda como está.
4. En el `.env` de la API: `ORIGEN_LANDING=https://nitout.com`, la Secret Key
   real de Turnstile y `ORIGEN_WEB=https://app.nitout.com` (mudanza).
5. Turnstile de verdad: Cloudflare → **Turnstile → Add widget**, dominio
   `nitout.com`, modo **Managed**. La Site Key va en `js/config.js` y la
   Secret Key en el `.env` de la API.
6. En Cloudflare → **Analytics → Web Analytics**, deja **apagada** la
   inyección automática: el CSP la bloquearía. Las visitas se ven igual en
   Analytics del dominio.
7. Google Search Console: añade `https://nitout.com/sitemap.xml`.

**✅ Comprueba:** `node scripts/humo.mjs https://nitout.com --produccion`.

### La mudanza de la app a app.nitout.com

No es de este repo, pero va junto con la Parte 3:

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
