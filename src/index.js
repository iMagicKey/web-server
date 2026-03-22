import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
}

class WebServer {
    constructor(options) {
        const serverType = options?.https ? https : http
        this.server = serverType.createServer(options, this.requestListener.bind(this))

        this.assets = options?.assets ?? []
        this.routes = []
        this.middlewares = []
        this.nextRequestHandler = options?.nextRequestHandler ?? null
        this.onError = options?.onError ?? null
    }

    _setupResponse(res) {
        if (res.json) return
        res.redirect = function (code, location) {
            this.writeHead(code, { Location: location })
            return this.end()
        }
        res.status = function (code) {
            res.statusCode = code
            return this
        }
        res.json = function (object) {
            this.setHeader('Content-Type', 'application/json')
            return this.end(JSON.stringify(object))
        }
    }

    requestListener(req, res) {
        const [pathname, query] = req.url.split('?')

        req.pathname = pathname
        req.query = query ? Object.fromEntries(new URLSearchParams(query)) : {}
        req.params = {}

        this._setupResponse(res)

        const runMiddleware = (index) => {
            if (index < this.middlewares.length) {
                this.middlewares[index](req, res, () => {
                    runMiddleware(index + 1)
                })
            } else {
                this.handleRequest(req, res)
            }
        }

        runMiddleware(0)
    }

    handleRequest(req, res) {
        const url = req.pathname

        let [asset] = this.assets.filter((asset) => {
            return (asset.dir && url.indexOf(asset.route) === 0) || (asset.file && asset.route === url)
        })

        if (asset) {
            let filepath
            if (asset.dir) {
                filepath = url.replace(asset.route, asset.dir)
            } else {
                filepath = asset.file
            }

            const readStream = fs.createReadStream(filepath)
            readStream.on('error', (err) => {
                if (err.code === 'ENOENT' || err.code === 'EISDIR') {
                    res.writeHead(404)
                    res.end('404')
                } else {
                    res.writeHead(500)
                    res.end('500')
                }
            })
            readStream.on('open', () => {
                res.setHeader('Content-Type', MIME_TYPES[path.extname(filepath)] || 'application/octet-stream')
                readStream.pipe(res)
            })
            return
        }

        const matchedRoute = this.matchRoute(url, req.method)
        if (matchedRoute) {
            req.params = matchedRoute.params
            try {
                return matchedRoute.callback(req, res)
            } catch (err) {
                if (this.onError) this.onError(err, req, res)
                res.writeHead(500)
                res.end('500')
            }
            return
        }

        if (this.nextRequestHandler) {
            return this.nextRequestHandler(req, res)
        }

        res.writeHead(404)
        res.end('404')
    }

    matchRoute(url, method) {
        for (let route of this.routes) {
            const methodMatches = route.methods.includes('*') || route.methods.includes(method)
            const match = route.regex.exec(url)

            if (methodMatches && match) {
                const params = this.extractParams(route.url, match)
                return { callback: route.callback, params }
            }
        }
        return null
    }

    getRouteRegex(route) {
        if (route === '*') return /^.*$/

        const regexString = route
            .split('/')
            .map((segment) => {
                if (segment.startsWith(':')) {
                    const match = segment.match(/^:(\w+)(\(([^)]+)\))?(\*)?$/)
                    if (match) {
                        const pattern = match[3] || '[\\w-]+'
                        const isWildcard = !!match[4]
                        return isWildcard ? `(${pattern}(?:\\/.*)?)` : `(${pattern})`
                    }
                }
                return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            })
            .join('\\/')

        return new RegExp(`^${regexString}$`)
    }

    extractParams(route, match) {
        const paramNames = (route.match(/:\w+\*?|/g) || []).filter(Boolean).map((param) => param.replace(/^:/, '').replace(/\*$/, ''))

        const params = {}
        paramNames.forEach((name, index) => {
            params[name] = match[index + 1]
        })

        return params
    }

    createRoute(options, callback) {
        const routeOptions = {
            methods: ['*'],
            ...options,
            callback,
        }
        routeOptions.methods = routeOptions.methods.map((method) => method.toUpperCase())
        routeOptions.regex = this.getRouteRegex(routeOptions.url)
        this.routes.push(routeOptions)
    }

    use(middleware) {
        this.middlewares.push(middleware)
    }

    listen(...args) {
        return this.server.listen(...args)
    }
}

export default WebServer
