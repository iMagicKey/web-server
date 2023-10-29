# Web-server - Very light HTTP/s web server

## Installing

```shell
npm install imagic-web-server
```

## How to use
```js
import WebServer from 'imagic-web-server'
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
server.listen(8080)
```
