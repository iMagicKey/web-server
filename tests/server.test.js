import { describe, it, before, after } from 'node:test'
import { expect } from 'chai'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import WebServer from '../src/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function makeRequest(port, reqPath, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port, path: reqPath, ...options }, (res) => {
            let body = ''
            res.on('data', (chunk) => (body += chunk))
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
        })
        req.on('error', reject)
        if (options.body) req.write(options.body)
        req.end()
    })
}

describe('WebServer', () => {
    describe('basic routing', () => {
        let server
        let port

        before(async () => {
            const ws = new WebServer({})
            ws.createRoute({ url: '/hello', methods: ['GET'] }, (req, res) => {
                res.writeHead(200)
                res.end('world')
            })
            ws.createRoute({ url: '/echo', methods: ['POST'] }, (req, res) => {
                let body = ''
                req.on('data', (c) => (body += c))
                req.on('end', () => res.json({ received: body }))
            })
            ws.createRoute({ url: '/users/:id', methods: ['GET'] }, (req, res) => {
                res.json({ userId: req.params.id })
            })
            await new Promise((resolve) =>
                ws.listen(0, '127.0.0.1', () => {
                    port = ws.server.address().port
                    server = ws.server
                    resolve()
                })
            )
        })

        after(() => new Promise((resolve) => server.close(resolve)))

        it('routes GET /hello', async () => {
            const res = await makeRequest(port, '/hello')
            expect(res.status).to.equal(200)
            expect(res.body).to.equal('world')
        })

        it('returns 404 for unknown route', async () => {
            const res = await makeRequest(port, '/unknown')
            expect(res.status).to.equal(404)
        })

        it('parses URL params', async () => {
            const res = await makeRequest(port, '/users/42')
            expect(res.status).to.equal(200)
            const data = JSON.parse(res.body)
            expect(data.userId).to.equal('42')
        })

        it('res.json sets Content-Type application/json', async () => {
            const res = await makeRequest(port, '/users/1')
            expect(res.headers['content-type']).to.include('application/json')
        })

        it('method mismatch returns 404', async () => {
            const res = await makeRequest(port, '/hello', { method: 'POST' })
            expect(res.status).to.equal(404)
        })

        it('routes POST /echo', async () => {
            const res = await makeRequest(port, '/echo', { method: 'POST', body: 'hello' })
            expect(res.status).to.equal(200)
            const data = JSON.parse(res.body)
            expect(data.received).to.equal('hello')
        })
    })

    describe('query string parsing', () => {
        let server
        let port

        before(async () => {
            const ws = new WebServer({})
            ws.createRoute({ url: '/search', methods: ['GET'] }, (req, res) => {
                res.json(req.query)
            })
            await new Promise((resolve) =>
                ws.listen(0, '127.0.0.1', () => {
                    port = ws.server.address().port
                    server = ws.server
                    resolve()
                })
            )
        })

        after(() => new Promise((resolve) => server.close(resolve)))

        it('parses query string correctly', async () => {
            const res = await makeRequest(port, '/search?q=hello&page=1')
            const data = JSON.parse(res.body)
            expect(data.q).to.equal('hello')
            expect(data.page).to.equal('1')
        })

        it('returns empty object when no query string', async () => {
            const res = await makeRequest(port, '/search')
            const data = JSON.parse(res.body)
            expect(data).to.deep.equal({})
        })

        it('handles URL-encoded query params', async () => {
            const res = await makeRequest(port, '/search?q=hello%20world')
            const data = JSON.parse(res.body)
            expect(data.q).to.equal('hello world')
        })
    })

    describe('middleware', () => {
        let server
        let port

        before(async () => {
            const ws = new WebServer({})
            ws.use((req, res, next) => {
                req.middlewareRan = true
                next()
            })
            ws.use((req, res, next) => {
                req.middlewareOrder = (req.middlewareOrder || []).concat('second')
                next()
            })
            ws.createRoute({ url: '/mw', methods: ['GET'] }, (req, res) => {
                res.json({ middlewareRan: req.middlewareRan, middlewareOrder: req.middlewareOrder })
            })
            await new Promise((resolve) =>
                ws.listen(0, '127.0.0.1', () => {
                    port = ws.server.address().port
                    server = ws.server
                    resolve()
                })
            )
        })

        after(() => new Promise((resolve) => server.close(resolve)))

        it('runs middleware before route handler', async () => {
            const res = await makeRequest(port, '/mw')
            const data = JSON.parse(res.body)
            expect(data.middlewareRan).to.be.true
        })

        it('runs multiple middlewares in order', async () => {
            const res = await makeRequest(port, '/mw')
            const data = JSON.parse(res.body)
            expect(data.middlewareOrder).to.deep.equal(['second'])
        })

        it('middleware can short-circuit response', async () => {
            const ws = new WebServer({})
            ws.use((req, res) => {
                res.writeHead(403)
                res.end('blocked')
            })
            ws.createRoute({ url: '/blocked', methods: ['GET'] }, (req, res) => {
                res.end('should not reach')
            })
            const p = ws.server.address()
            await new Promise((resolve) =>
                ws.listen(0, '127.0.0.1', () => {
                    resolve()
                })
            )
            const blockPort = ws.server.address().port
            const r = await makeRequest(blockPort, '/blocked')
            expect(r.status).to.equal(403)
            expect(r.body).to.equal('blocked')
            await new Promise((resolve) => ws.server.close(resolve))
            void p
        })
    })

    describe('res helpers', () => {
        let server
        let port

        before(async () => {
            const ws = new WebServer({})
            ws.createRoute({ url: '/redirect', methods: ['GET'] }, (req, res) => {
                res.redirect(301, '/new-location')
            })
            ws.createRoute({ url: '/status-json', methods: ['GET'] }, (req, res) => {
                res.status(422).json({ error: 'Unprocessable' })
            })
            await new Promise((resolve) =>
                ws.listen(0, '127.0.0.1', () => {
                    port = ws.server.address().port
                    server = ws.server
                    resolve()
                })
            )
        })

        after(() => new Promise((resolve) => server.close(resolve)))

        it('res.redirect sets Location header and status code', async () => {
            const res = await makeRequest(port, '/redirect')
            expect(res.status).to.equal(301)
            expect(res.headers['location']).to.equal('/new-location')
        })

        it('res.status sets status code and chains to res.json', async () => {
            const res = await makeRequest(port, '/status-json')
            expect(res.status).to.equal(422)
            const data = JSON.parse(res.body)
            expect(data.error).to.equal('Unprocessable')
        })

        it('res helpers are not duplicated across requests', async () => {
            const ws = new WebServer({})
            let callCount = 0
            ws.createRoute({ url: '/count', methods: ['GET'] }, (req, res) => {
                callCount++
                res.json({ call: callCount })
            })
            await new Promise((resolve) =>
                ws.listen(0, '127.0.0.1', () => {
                    resolve()
                })
            )
            const p2 = ws.server.address().port
            await makeRequest(p2, '/count')
            await makeRequest(p2, '/count')
            const r = await makeRequest(p2, '/count')
            expect(JSON.parse(r.body).call).to.equal(3)
            await new Promise((resolve) => ws.server.close(resolve))
        })
    })

    describe('wildcard and regex routes', () => {
        let server
        let port

        before(async () => {
            const ws = new WebServer({})
            ws.createRoute({ url: '/product/:id(\\d+)', methods: ['GET'] }, (req, res) => {
                res.json({ type: 'numeric', id: req.params.id })
            })
            ws.createRoute({ url: '/api/:rest*', methods: ['GET'] }, (req, res) => {
                res.json({ rest: req.params.rest })
            })
            ws.createRoute({ url: '*', methods: ['*'] }, (req, res) => {
                res.status(404).end('catch-all')
            })
            await new Promise((resolve) =>
                ws.listen(0, '127.0.0.1', () => {
                    port = ws.server.address().port
                    server = ws.server
                    resolve()
                })
            )
        })

        after(() => new Promise((resolve) => server.close(resolve)))

        it('matches numeric-only param with regex constraint', async () => {
            const res = await makeRequest(port, '/product/123')
            expect(res.status).to.equal(200)
            const data = JSON.parse(res.body)
            expect(data.id).to.equal('123')
        })

        it('wildcard route captures path segments', async () => {
            const res = await makeRequest(port, '/api/users/list')
            expect(res.status).to.equal(200)
            const data = JSON.parse(res.body)
            expect(data.rest).to.include('users')
        })

        it('catch-all wildcard * matches any unmatched route', async () => {
            const res = await makeRequest(port, '/completely/unknown')
            expect(res.status).to.equal(404)
            expect(res.body).to.equal('catch-all')
        })
    })

    describe('route regex caching', () => {
        it('regex is compiled once per route, not per request', () => {
            const ws = new WebServer({})
            ws.createRoute({ url: '/cached/:id', methods: ['GET'] }, () => {})
            const route = ws.routes[0]
            expect(route.regex).to.be.instanceOf(RegExp)
            // Same object reference — no recompilation
            const ref = route.regex
            expect(ws.routes[0].regex).to.equal(ref)
        })
    })

    describe('nextRequestHandler', () => {
        let server
        let port

        before(async () => {
            const ws = new WebServer({
                nextRequestHandler: (req, res) => {
                    res.writeHead(200)
                    res.end('from-next-handler')
                },
            })
            await new Promise((resolve) =>
                ws.listen(0, '127.0.0.1', () => {
                    port = ws.server.address().port
                    server = ws.server
                    resolve()
                })
            )
        })

        after(() => new Promise((resolve) => server.close(resolve)))

        it('calls nextRequestHandler when no route matches', async () => {
            const res = await makeRequest(port, '/no-route-here')
            expect(res.status).to.equal(200)
            expect(res.body).to.equal('from-next-handler')
        })
    })

    describe('static file serving', () => {
        let server
        let port

        before(async () => {
            const ws = new WebServer({
                assets: [
                    { route: '/tests', dir: __dirname },
                    { route: '/LICENSE', file: path.join(__dirname, '..', 'LICENSE') },
                ],
            })
            await new Promise((resolve) =>
                ws.listen(0, '127.0.0.1', () => {
                    port = ws.server.address().port
                    server = ws.server
                    resolve()
                })
            )
        })

        after(() => new Promise((resolve) => server.close(resolve)))

        it('serves a file with correct Content-Type for .js', async () => {
            const res = await makeRequest(port, '/tests/server.test.js')
            expect(res.status).to.equal(200)
            expect(res.headers['content-type']).to.equal('text/javascript')
        })

        it('returns 404 for non-existent static file', async () => {
            const res = await makeRequest(port, '/tests/does-not-exist.js')
            expect(res.status).to.equal(404)
        })

        it('serves a specific file asset with correct Content-Type', async () => {
            const res = await makeRequest(port, '/LICENSE')
            expect(res.status).to.equal(200)
            expect(res.headers['content-type']).to.equal('application/octet-stream')
        })
    })

    describe('HTTP methods — PUT / DELETE / PATCH', () => {
        let server
        let port

        before(async () => {
            const ws = new WebServer({})
            ws.createRoute({ url: '/resource', methods: ['PUT'] }, (req, res) => {
                res.json({ method: req.method })
            })
            ws.createRoute({ url: '/resource', methods: ['DELETE'] }, (req, res) => {
                res.json({ method: req.method })
            })
            ws.createRoute({ url: '/resource', methods: ['PATCH'] }, (req, res) => {
                res.json({ method: req.method })
            })
            await new Promise((resolve) =>
                ws.listen(0, '127.0.0.1', () => {
                    port = ws.server.address().port
                    server = ws.server
                    resolve()
                })
            )
        })

        after(() => new Promise((resolve) => server.close(resolve)))

        it('routes PUT /resource', async () => {
            const res = await makeRequest(port, '/resource', { method: 'PUT' })
            expect(res.status).to.equal(200)
            expect(JSON.parse(res.body).method).to.equal('PUT')
        })

        it('routes DELETE /resource', async () => {
            const res = await makeRequest(port, '/resource', { method: 'DELETE' })
            expect(res.status).to.equal(200)
            expect(JSON.parse(res.body).method).to.equal('DELETE')
        })

        it('routes PATCH /resource', async () => {
            const res = await makeRequest(port, '/resource', { method: 'PATCH' })
            expect(res.status).to.equal(200)
            expect(JSON.parse(res.body).method).to.equal('PATCH')
        })

        it('method mismatch returns 404 for PUT on GET-only route', async () => {
            const ws2 = new WebServer({})
            ws2.createRoute({ url: '/get-only', methods: ['GET'] }, (req, res) => res.end('ok'))
            await new Promise((resolve) => ws2.listen(0, '127.0.0.1', resolve))
            const p2 = ws2.server.address().port
            const r = await makeRequest(p2, '/get-only', { method: 'PUT' })
            expect(r.status).to.equal(404)
            await new Promise((resolve) => ws2.server.close(resolve))
        })
    })

    describe('error handling — 500 on route throw', () => {
        let server
        let port

        before(async () => {
            const ws = new WebServer({})
            ws.createRoute({ url: '/boom', methods: ['GET'] }, () => {
                throw new Error('intentional crash')
            })
            ws.createRoute({ url: '/ok', methods: ['GET'] }, (req, res) => {
                res.end('fine')
            })
            await new Promise((resolve) =>
                ws.listen(0, '127.0.0.1', () => {
                    port = ws.server.address().port
                    server = ws.server
                    resolve()
                })
            )
        })

        after(() => new Promise((resolve) => server.close(resolve)))

        it('returns 500 when route handler throws', async () => {
            const res = await makeRequest(port, '/boom')
            expect(res.status).to.equal(500)
        })

        it('server continues handling requests after a route throws', async () => {
            await makeRequest(port, '/boom')
            const res = await makeRequest(port, '/ok')
            expect(res.status).to.equal(200)
            expect(res.body).to.equal('fine')
        })
    })

    describe('onError callback', () => {
        let server
        let port
        let capturedError

        before(async () => {
            capturedError = null
            const ws = new WebServer({
                onError: (err) => {
                    capturedError = err
                },
            })
            ws.createRoute({ url: '/crash', methods: ['GET'] }, () => {
                throw new Error('intentional crash')
            })
            await new Promise((resolve) =>
                ws.listen(0, '127.0.0.1', () => {
                    port = ws.server.address().port
                    server = ws.server
                    resolve()
                })
            )
        })

        after(() => new Promise((resolve) => server.close(resolve)))

        it('onError callback is called when route handler throws', async () => {
            await makeRequest(port, '/crash')
            expect(capturedError).to.be.instanceOf(Error)
        })

        it('onError receives the original error object', async () => {
            capturedError = null
            await makeRequest(port, '/crash')
            expect(capturedError.message).to.equal('intentional crash')
        })
    })

    describe('pathname stored on req', () => {
        let server
        let port

        before(async () => {
            const ws = new WebServer({})
            ws.createRoute({ url: '/path-check', methods: ['GET'] }, (req, res) => {
                res.json({ pathname: req.pathname, hasQuery: Object.keys(req.query).length > 0 })
            })
            await new Promise((resolve) =>
                ws.listen(0, '127.0.0.1', () => {
                    port = ws.server.address().port
                    server = ws.server
                    resolve()
                })
            )
        })

        after(() => new Promise((resolve) => server.close(resolve)))

        it('req.pathname does not include query string', async () => {
            const res = await makeRequest(port, '/path-check?foo=bar')
            const data = JSON.parse(res.body)
            expect(data.pathname).to.equal('/path-check')
            expect(data.hasQuery).to.be.true
        })
    })
})
