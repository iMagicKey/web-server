// examples/server.js
import WebServer from '../src/index.js'

const server = new WebServer({})

// Middleware: simple request logger
server.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`)
    next()
})

// JSON API route
server.createRoute({ url: '/api/hello', methods: ['GET'] }, (req, res) => {
    res.json({ message: 'Hello from imagic-web-server!', query: req.query })
})

// Route with URL params
server.createRoute({ url: '/api/users/:id', methods: ['GET'] }, (req, res) => {
    res.json({ userId: req.params.id })
})

// POST route
server.createRoute({ url: '/api/echo', methods: ['POST'] }, (req, res) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
        try {
            res.json({ received: JSON.parse(body) })
        } catch {
            res.status(400).json({ error: 'Invalid JSON' })
        }
    })
})

// Redirect
server.createRoute({ url: '/old', methods: ['GET'] }, (req, res) => {
    res.redirect(301, '/api/hello')
})

server.listen(3000, '127.0.0.1', () => {
    console.log('Server running on http://127.0.0.1:3000')
    console.log('Try: curl http://127.0.0.1:3000/api/hello?name=world')
})
