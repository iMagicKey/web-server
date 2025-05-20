# imagic-web-server

`imagic-web-server` is a lightweight and flexible Node.js web server module that provides a powerful framework for building HTTP/HTTPS services with support for custom routes, middlewares, static assets, route parameters (including wildcards and regex), and dynamic routing.

---

## Installation

Install via npm:

```bash
npm install imagic-web-server
```

---

## Getting Started

```javascript
import WebServer from 'imagic-web-server'
import { resolve } from 'path'

const ROOT_PATH = resolve()

const server = new WebServer({
    https: false, // Set true to enable HTTPS with key/cert options
    assets: [
        { route: '/assets', dir: ROOT_PATH + '/public' },
        { route: '/LICENSE', file: ROOT_PATH + '/LICENSE' },
    ],
})

server.listen(8080, 'localhost', () => {
    console.log('Server is running at http://localhost:8080')
})
```

---

## Features

### 1. **Custom Routes**

```javascript
server.createRoute({ methods: ['GET'], url: '/hello' }, (req, res) => {
    res.end('Hello world')
})
```

### 2. **Route Parameters**

Supports named params (`:id`), wildcards (`:rest*`), and regex:

```javascript
server.createRoute({ methods: ['GET'], url: '/user/:id/:action' }, (req, res) => {
    const { id, action } = req.params
    res.end(`User ID: ${id}, Action: ${action}`)
})

server.createRoute({ methods: ['GET'], url: '/api/:rest*' }, (req, res) => {
    res.end(`REST URI: ${req.params.rest}`)
})

server.createRoute({ methods: ['GET'], url: '/number/:id(\\d+)' }, (req, res) => {
    res.end(`Number ID: ${req.params.id}`)
})
```

### 3. **Wildcard Catch-All**

```javascript
server.createRoute({ methods: ['*'], url: '*' }, (req, res) => {
    res.status(404).end('Not Found')
})
```

---

## Middlewares

```javascript
server.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`)
    next()
})

server.use((req, res, next) => {
    if (Math.random() > 0.8) {
        res.json({ code: 403, message: 'Forbidden' })
    } else {
        next()
    }
})
```

Middlewares are executed in order before route handlers. Use `next()` to pass control.

---

## Static Assets

Supports directory and file-level asset serving:

```javascript
assets: [
    { route: '/assets', dir: 'public' },
    { route: '/readme', file: 'README.md' },
]
```

---

## HTTPS Support

```javascript
import fs from 'fs'
import WebServer from 'imagic-web-server'
import { resolve } from 'path'

const ROOT_PATH = resolve()

const server = new WebServer({
    port: 8080,
    https: true,
    key: fs.readFileSync('./path/to/key.pem'),
    cert: fs.readFileSync('./path/to/cert.pem'),
})
```

---

## Response Helpers

-   `res.status(code)` – set HTTP status code
-   `res.json(data)` – send JSON
-   `res.redirect(code, url)` – redirect
-   `res.end(body)` – end response with body

---

## Route Matching Syntax

| Syntax            | Example URL             | Matches                         |
| ----------------- | ----------------------- | ------------------------------- |
| `/user/:id`       | `/user/123`             | `{ id: '123' }`                 |
| `/file/:name*`    | `/file/images/logo.png` | `{ name: 'images/logo.png' }`   |
| `/:slug(\\w{3,})` | `/abc`                  | `{ slug: 'abc' }` if 3+ letters |
| `*`               | Any unmatched route     | Used for 404 catch-all          |

---

## Example

```javascript
server.createRoute({ methods: ['GET'], url: '/health' }, (req, res) => {
    res.json({ status: 'ok' })
})
```

---

## Conclusion

`imagic-web-server` is a powerful utility for building flexible web servers with rich routing capabilities, middleware support, and static file handling. Ideal for small services, mock APIs, and embedded servers.

> Fast to write. Easy to extend. Fully customizable.
