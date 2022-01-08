const WebServer = require('./index')

let server = new WebServer({
    assets: [
        { route: '/assets/', dir: __dirname + '/' },
        { route: '/123', file: __dirname + '/LICENSE' }
    ]
})

server.createRoute({ methods: ['GET'], url: '/hello' }, (res, req) => {
    req.end('world')
})
server.listen(8080)