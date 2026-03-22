# AGENT — imagic-web-server

## Purpose

Create HTTP or HTTPS servers with named route parameters, ordered middleware, static file serving, and response helpers — no framework required.

## Package

- npm: `imagic-web-server`
- import (local): `import WebServer from '../src/index.js'`
- import (installed): `import WebServer from 'imagic-web-server'`
- zero runtime deps

## Exports

### `new WebServer(options?): WebServer` *(default export)*

- `options.https` {boolean} [false] — create an HTTPS server; requires `key` and `cert`
- `options.key` {Buffer | string} [undefined] — TLS private key PEM; required when `https: true`
- `options.cert` {Buffer | string} [undefined] — TLS certificate PEM; required when `https: true`
- `options.assets` {Array<{route, dir} | {route, file}>} [[]] — static asset entries
- `options.nextRequestHandler` {(req, res) => void} [undefined] — fallback called when no route matches; useful for Next.js custom server
- returns: `WebServer` instance
- throws: nothing at construction time

---

### `.createRoute(options, callback): void`

- `options.url` {string} **required** — route pattern; supports `:param`, `:param*`, `:param(regex)`, `*`
- `options.methods` {string[]} [['*']] — HTTP methods to match; `'*'` element matches all methods
- `callback` {(req, res) => void} **required** — called when route matches
- returns: void
- throws: nothing

Routes match in registration order. First match wins.

---

### `.use(middleware): void`

- `middleware` {(req, res, next: () => void) => void} **required** — middleware function
- returns: void

Middlewares run in registration order before route handlers. Must call `next()` to continue; if not called, the request stops.

---

### `.listen(...args): net.Server`

- Delegates directly to Node.js `server.listen()`
- Accepts same arguments: `(port)`, `(port, hostname)`, `(port, callback)`, `(port, hostname, callback)`, `(options, callback)`
- returns: `net.Server` (or `tls.Server` for HTTPS)

---

### Request enhancements (set before middleware/handlers)

| Property | Type | Description |
|---|---|---|
| `req.pathname` | `string` | Path without query string |
| `req.query` | `object` | Parsed query parameters |
| `req.params` | `object` | Route parameter values extracted from URL |

---

### Response enhancements

| Method | Signature | Notes |
|---|---|---|
| `res.json(data)` | `(data: object) => void` | Sets `Content-Type: application/json`, calls `JSON.stringify`, ends response |
| `res.status(code)` | `(code: number) => res` | Sets `statusCode`; chainable — returns `res` |
| `res.redirect(code, location)` | `(code: number, location: string) => void` | Sends redirect via `writeHead` + `end` |

## Usage Patterns

### Minimal HTTP server

```js
import WebServer from 'imagic-web-server'

const server = new WebServer()

server.createRoute({ url: '/health', methods: ['GET'] }, (req, res) => {
    res.json({ ok: true })
})

server.listen(3000)
```

### Route parameters

```js
server.createRoute({ url: '/users/:id', methods: ['GET'] }, (req, res) => {
    res.json({ id: req.params.id })
})

// Wildcard segment (matches slashes)
server.createRoute({ url: '/files/:path*', methods: ['GET'] }, (req, res) => {
    res.json({ path: req.params.path }) // e.g. 'images/logo.png'
})

// Custom regex constraint
server.createRoute({ url: '/items/:id([0-9]+)', methods: ['GET'] }, (req, res) => {
    res.json({ id: req.params.id }) // only numeric IDs match
})
```

### Query parameters

```js
server.createRoute({ url: '/search', methods: ['GET'] }, (req, res) => {
    const { q = '', page = '1' } = req.query
    res.json({ q, page: Number(page) })
})
```

### Middleware (logging + auth)

```js
server.use((req, res, next) => {
    console.log(`${req.method} ${req.pathname}`)
    next()
})

server.use((req, res, next) => {
    const token = req.headers['authorization']
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    next()
})
```

### Static assets

```js
const server = new WebServer({
    assets: [
        { route: '/static', dir: './public' },       // directory
        { route: '/favicon.ico', file: './favicon.ico' }, // single file
    ],
})
```

### HTTPS server

```js
import fs from 'node:fs'

const server = new WebServer({
    https: true,
    key: fs.readFileSync('./certs/key.pem'),
    cert: fs.readFileSync('./certs/cert.pem'),
})

server.listen(443)
```

### 404 catch-all (register last)

```js
server.createRoute({ url: '*', methods: ['*'] }, (req, res) => {
    res.status(404).json({ error: 'Not Found' })
})
```

### Chaining status + json

```js
res.status(422).json({ error: 'Validation failed', field: 'email' })
```

### Next.js fallback

```js
import next from 'next'

const app = next({ dev: false })
await app.prepare()

const server = new WebServer({ nextRequestHandler: app.getRequestHandler() })
server.listen(3000)
```

## Constraints / Gotchas

- **Route registration order matters.** First matching route wins. Register specific routes before catch-alls (`*`).
- **`methods: ['*']` is the default.** It matches GET, POST, PUT, DELETE, etc. Always specify methods if you want method-specific routing.
- **`req.pathname` strips the query string.** Route patterns must not include `?` or query parameters — match against `req.pathname`, access query via `req.query`.
- **Async handlers are not wrapped.** If an async route handler rejects, the error propagates to the Node.js process. Wrap in try/catch and call `res.status(500).json(...)` yourself.
- **Middleware must call `next()` or end the response.** Forgetting both will leave the request hanging with no response.
- **`res.json()` calls `res.end()`.** Do not write to `res` after calling `res.json()`.
- **`res.status()` returns `res` for chaining** — it does not end the response. Chain with `.json()` or `.end()`.
- **Static `dir` paths are relative to the process CWD, not the source file.** Use `path.resolve()` or absolute paths to avoid surprises.
- **MIME types are auto-detected** for: html, css, js, json, png, jpg, gif, svg, ico, txt, pdf, mp4, webm, mp3, woff, woff2, ttf, otf, xml, zip. Unknown extensions default to `application/octet-stream`.
- **`nextRequestHandler`** can also be set as `server.nextRequestHandler = fn` after construction — it is a plain property.
- **No built-in body parsing.** `req.body` is not populated. Add middleware to parse JSON or form data from `req` as a readable stream.
- **`:param(regex)` uses the regex as a capturing group inside the URL pattern.** Special regex characters must be properly escaped in the string.
