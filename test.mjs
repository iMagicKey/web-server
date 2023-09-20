import WebServer from './index.mjs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let server = new WebServer({
    assets: [
        { route: '/assets', dir: __dirname + '/' },
        { route: '/LICENSE', file: __dirname + '/LICENSE' },
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
server.listen(8080)
