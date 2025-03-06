import WebServer from '../src/index.js'
import { resolve } from 'path'

const ROOT_PATH = resolve()

let server = new WebServer({
    assets: [
        { route: '/assets', dir: ROOT_PATH + '/' },
        { route: '/LICENSE', file: ROOT_PATH + '/LICENSE' },
    ],
})

server.use((req, res, next) => {
    if (Math.random() > 0.5) {
        res.json({
            code: 403,
            message: 'forbidden',
        })
    } else {
        next()
    }
})

server.createRoute({ methods: ['GET'], url: '/hello' }, (req, res) => {
    res.end('Hello world')
})

server.createRoute({ methods: ['GET'], url: '/user/:id/:action' }, (req, res) => {
    res.end(`Hello user with id: ${req.params.id} action: ${req.params.action}`)
})

server.listen(8080)
