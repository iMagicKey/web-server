const http = require('http')
const https = require('https')
const fs = require('fs')

class WebServer {
    constructor(options) {
        const serverType = options?.https ? https : http
        this.server = serverType.createServer(options, this.requestListener.bind(this))

        this.assets = options?.assets ?? []
        this.routes = []
    }

    requestListener(req, res) {
        let url = req.url
        let method = req.method
        
        let [ asset ] = this.assets.filter((asset) => {
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
        }

        let [ route ] = this.routes.filter((route) => {
            let methodCondition = route.methods.includes('*') || route.methods.includes(method)
            let urlCondition = route.url == url

            return methodCondition && urlCondition
        })

        if (route) {
            return route.callback(req, res)
        }

        res.writeHead(404)
        res.end(`404`)
    }

    createRoute(options, callback) {
        let routeOptions = {
            methods: ['*'],
            ...options,
            callback: callback
        }
        routeOptions.methods = routeOptions.methods.map((method) => method.toUpperCase())

        this.routes.push(routeOptions)
    }

    listen(port) {
        return this.server.listen(port)
    }
}

module.exports = WebServer