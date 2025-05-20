// Example of using the custom WebServer class with regex-based routing

import WebServer from '../src/index.js'
import { resolve } from 'path'

const ROOT_PATH = resolve()

// Create the server instance
const server = new WebServer({
    // Example of static assets (disabled here for simplicity)
    assets: [
        { route: '/assets', dir: ROOT_PATH + '/' },
        { route: '/LICENSE', file: ROOT_PATH + '/LICENSE' },
    ],
})

// Middleware that logs each request
server.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`)
    next()
})

// Middleware that randomly blocks some requests
server.use((req, res, next) => {
    if (Math.random() > 0.8) {
        return res.status(403).json({
            code: 403,
            message: 'Access Denied by Middleware',
        })
    }
    next()
})

/**
 * Basic route with a parameter
 * Example: GET /user/123
 */
server.createRoute({ methods: ['GET'], url: '/user/:id' }, (req, res) => {
    res.end(`User ID: ${req.params.id}`)
})

/**
 * Route with regex: only numeric product IDs
 * Example: GET /product/456 (valid)
 *          GET /product/abc (invalid)
 */
server.createRoute({ methods: ['GET'], url: '/product/:id(\\d+)' }, (req, res) => {
    res.end(`Numeric Product ID: ${req.params.id}`)
})

/**
 * Route with slug format (lowercase letters, numbers, dashes)
 * Example: GET /post/hello-world-2025
 */
server.createRoute({ methods: ['GET'], url: '/post/:slug([a-z0-9\\-]+)' }, (req, res) => {
    res.end(`Post Slug: ${req.params.slug}`)
})

/**
 * Wildcard route: captures everything after /api/
 * Example: GET /api/users/list → rest = "users/list"
 */
server.createRoute({ methods: ['GET'], url: '/api/:rest*' }, (req, res) => {
    res.end(`API Path: ${req.params.rest}`)
})

/**
 * Route with multiple regex parameters
 * Example: GET /report/2025/05 → year = "2025", month = "05"
 */
server.createRoute({ methods: ['GET'], url: '/report/:year(\\d{4})/:month(\\d{2})' }, (req, res) => {
    const { year, month } = req.params
    res.end(`Monthly Report for ${year}-${month}`)
})

/**
 * Catch-all fallback route for unmatched paths
 */
server.createRoute({ methods: ['*'], url: '*' }, (req, res) => {
    res.status(404).end('404 Not Found')
})

// Start the server
const PORT = 8080
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`)
})
