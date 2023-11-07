import http from 'http'
import https from 'https'
import fs from 'fs'
import querystring from 'querystring'

class WebServer {
    constructor(options) {
        const serverType = options?.https ? https : http
        this.server = serverType.createServer(options, this.requestListener.bind(this))

        this.assets = options?.assets ?? []
        this.routes = []
        this.middlewares = []
        this.nextRequestHandler = options?.nextRequestHandler ?? null
    }

    requestListener(req, res) {
        let [url, params] = req.url.split('?')

        if (params) {
            req.params = querystring.parse(params)
        }

        res.redirect = function (code, location) {
            this.writeHead(code, {
                Location: location,
            })
            return this.end()
        }

        res.status = function (code) {
            res.statusCode = code

            return this
        }

        res.json = function (object) {
            return this.end(JSON.stringify(object))
        }

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
        let [url] = req.url.split('?')

        let [asset] = this.assets.filter((asset) => {
            return (asset.dir && url.indexOf(asset.route) == 0) || (asset.file && asset.route == url)
        })

        if (asset) {
            let filepath
            if (asset.dir) {
                filepath = url.replace(asset.route, asset.dir)
            } else {
                filepath = asset.file
            }

            if (fs.existsSync(filepath)) {
                let stats = fs.statSync(filepath)
                if (stats.isFile()) {
                    let readStream = fs.createReadStream(filepath)
                    readStream.on('open', () => {
                        readStream.pipe(res)
                    })
                    return
                }
            }
        } else {
            let [route] = this.routes.filter((route) => {
                let methodCondition = route.methods.includes('*') || route.methods.includes(req.method)
                let urlCondition = route.url == url

                return methodCondition && urlCondition
            })

            if (route) {
                return route.callback(req, res)
            }
        }

        if (this.nextRequestHandler) {
            return this.nextRequestHandler(req, res)
        }

        res.writeHead(404)
        res.end(`404`)
    }

    createRoute(options, callback) {
        let routeOptions = {
            methods: ['*'],
            ...options,
            callback: callback,
        }
        routeOptions.methods = routeOptions.methods.map((method) => method.toUpperCase())

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
