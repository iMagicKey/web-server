# imagic-web-server

> Lightweight HTTP/HTTPS server with named route params, middleware, static assets, and response helpers.

## Install

```bash
npm install imagic-web-server
```

## Quick Start

```js
import WebServer from 'imagic-web-server'

const server = new WebServer()

server.use((req, res, next) => {
    console.log(`${req.method} ${req.pathname}`)
    next()
})

server.createRoute({ url: '/api/users/:id', methods: ['GET'] }, (req, res) => {
    res.json({ userId: req.params.id })
})

server.listen(3000, () => console.log('Listening on http://localhost:3000'))
```

## API

### `new WebServer(options?)`

Creates a web server instance. Does not bind a port until `listen()` is called.

```ts
new WebServer(options?: {
    https?: boolean
    key?: Buffer | string
    cert?: Buffer | string
    assets?: Array<AssetDir | AssetFile>
    nextRequestHandler?: (req, res) => void
    onError?: (err: Error, req, res) => void
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `https` | `boolean` | `false` | Create an HTTPS server. Requires `key` and `cert` |
| `key` | `Buffer \| string` | — | TLS private key (PEM). Required when `https: true` |
| `cert` | `Buffer \| string` | — | TLS certificate (PEM). Required when `https: true` |
| `assets` | `Array<AssetDir \| AssetFile>` | `[]` | Static file serving entries (see below) |
| `nextRequestHandler` | `(req, res) => void` | — | Fallback handler for requests that match no route; used for Next.js custom server integration |
| `onError` | `(err, req, res) => void` | — | Called when a synchronous route handler throws, before the 500 response is sent |

**`AssetDir`** — serve an entire directory under a route prefix:
```ts
{ route: string, dir: string }
// e.g. { route: '/static', dir: './public' }
```

**`AssetFile`** — serve a single file at a fixed route:
```ts
{ route: string, file: string }
// e.g. { route: '/favicon.ico', file: './favicon.ico' }
```

---

### `createRoute(options, callback): void`

Registers a route handler.

```ts
createRoute(
    options: {
        url: string
        methods?: string[]
    },
    callback: (req: EnhancedRequest, res: EnhancedResponse) => void
): void
```

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | required | Route pattern (see route syntax below) |
| `methods` | `string[]` | `['*']` | HTTP methods to match. `'*'` matches all methods |

Routes are matched in registration order. The first match wins.

---

### `use(middleware): void`

Adds a middleware function executed before route handlers on every request.

```ts
use(middleware: (req: EnhancedRequest, res: EnhancedResponse, next: () => void) => void): void
```

Middlewares run in the order they were registered. Call `next()` to proceed. If `next()` is not called, the request is terminated.

---

### `listen(...args): net.Server`

Starts listening. Delegates directly to the underlying `node:http` (or `node:https`) `server.listen()`.

```ts
listen(port: number, callback?: () => void): net.Server
listen(port: number, hostname: string, callback?: () => void): net.Server
listen(options: object, callback?: () => void): net.Server
```

---

### Request enhancements

The following properties are set on every `req` object before middleware and route handlers run:

| Property | Type | Description |
|---|---|---|
| `req.pathname` | `string` | URL path without query string (e.g. `/users/42`) |
| `req.query` | `object` | Parsed query string parameters |
| `req.params` | `object` | Route parameters extracted from the URL pattern |

---

### Response enhancements

| Method | Signature | Description |
|---|---|---|
| `res.json(data)` | `(data: object) => void` | Sets `Content-Type: application/json`, serializes with `JSON.stringify`, calls `res.end()` |
| `res.status(code)` | `(code: number) => res` | Sets `res.statusCode`; returns `res` for chaining |
| `res.redirect(code, location)` | `(code: number, location: string) => void` | Sends a redirect response with `writeHead` + `end` |

## Route Syntax

Patterns are matched against `req.pathname` (path only, no query string).

| Pattern | Example URL | `req.params` |
|---|---|---|
| `/users/:id` | `/users/42` | `{ id: '42' }` |
| `/users/:id/posts/:postId` | `/users/1/posts/99` | `{ id: '1', postId: '99' }` |
| `/files/:path*` | `/files/images/logo.png` | `{ path: 'images/logo.png' }` |
| `/items/:id([0-9]+)` | `/items/123` | `{ id: '123' }` |
| `/items/:id([0-9]+)` | `/items/abc` | no match |
| `*` | any URL | catch-all (use for 404) |

- `:param` — matches a single path segment (no slashes)
- `:param*` — matches one or more segments including slashes
- `:param(regex)` — matches a segment against a custom regular expression
- `*` — matches any path unconditionally

## Error Handling

The library does not expose dedicated error types. Synchronous exceptions thrown inside route handlers are caught internally — the server responds with HTTP 500 and body `'500'`. The server continues handling subsequent requests normally.

> **Note:** async route handlers are not awaited. Errors thrown inside an `async` handler after the first `await` are unhandled promise rejections and are **not** caught by the library.

To receive caught errors, pass an `onError` callback:

```js
const server = new WebServer({
    onError: (err, req, res) => {
        console.error(`Route error: ${err.message}`)
    },
})
```

For custom error responses inside a handler, use a try/catch block:

```js
server.createRoute({ url: '/api/data', methods: ['GET'] }, async (req, res) => {
    try {
        const data = await fetchData()
        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})
```

For a global 404, register a catch-all route last:

```js
server.createRoute({ url: '*', methods: ['*'] }, (req, res) => {
    res.status(404).json({ error: 'Not Found' })
})
```

## Examples

See [`examples/`](./examples/) for runnable scripts, including:
- Basic HTTP server with routing and middleware
- HTTPS setup with self-signed certificates
- Static asset serving
- Next.js custom server integration

```js
// examples/server.js excerpt — HTTPS with assets
import fs from 'node:fs'
import WebServer from 'imagic-web-server'

const server = new WebServer({
    https: true,
    key: fs.readFileSync('./certs/key.pem'),
    cert: fs.readFileSync('./certs/cert.pem'),
    assets: [
        { route: '/static', dir: './public' },
        { route: '/favicon.ico', file: './public/favicon.ico' },
    ],
})

server.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'imagic-web-server')
    next()
})

server.createRoute({ url: '/api/health', methods: ['GET'] }, (req, res) => {
    res.json({ status: 'ok' })
})

server.listen(443, () => console.log('HTTPS server running on port 443'))
```

## License

MIT
