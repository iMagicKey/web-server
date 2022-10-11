const WebServer = require('./index')
 
let server = new WebServer({
    assets: [
        { route: '/assets', dir: __dirname + '/' },
        { route: '/LICENSE', file: __dirname + '/LICENSE' }
    ]
})

server.createRoute({ methods: ['GET'], url: '/hello' }, (req, res) => {
    res.end('world')
})
server.listen(8080)