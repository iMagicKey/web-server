# imagic-web-server

`imagic-web-server` is a lightweight and flexible Node.js web server module that provides a simple and extensible framework for serving web content and handling HTTP requests. It supports both HTTP and HTTPS, allows you to define custom routes and middlewares, and provides utilities for serving static assets. Below, you will find a comprehensive guide on how to use `imagic-web-server` with code examples for each of its features.

## Installation

You can install the `imagic-web-server` module using npm or yarn:

```bash
npm install imagic-web-server
```

## Getting Started

Here's how to create a basic web server instance using `imagic-web-server`:

```javascript
import WebServer from 'imagic-web-server';

// Initialize a new HTTP server
const server = new WebServer({
https: false, // Set to true for HTTPS
// Other server options (e.g., port, hostname) can be added here
assets: [
// Define your static assets configuration here (optional)
// Example: { route: '/static', dir: 'public' }
],
});

// Start the server on the specified port and hostname
```

To create an HTTP server, initialize a new WebServer instance with the desired options. You can specify whether you want to use HTTPS, set server options such as the port and hostname, and define static assets. You can add assets using the assets property, which is an array of asset configurations.

## Handling Requests

imagic-web-server provides a requestListener method to handle incoming HTTP requests. This method allows you to process requests and define routes and middlewares.
```javascript
server.requestListener = (req, res) => {
  // Request handling logic here
};
```

n the requestListener, you can access the req (request) and res (response) objects to handle the incoming request and generate the response.

### Adding Custom Routes
You can create custom routes using the createRoute method. A route is defined by an HTTP method, URL, and a callback function.

```javascript
server.createRoute({ methods: ['GET'], url: '/my-route' }, (req, res) => {
  // Handle the GET request for '/my-route'
});
```

In the example above, we create a custom route that listens for GET requests at the /my-route URL.

### Adding Middlewares
Middlewares are functions that can intercept and process requests before they reach the route handler. You can use the use method to add middlewares.

```javascript
server.use((req, res, next) => {
  // Middleware logic here
  next();
});
```

The next function should be called to pass control to the next middleware or the route handler.

### Starting the Server

After configuring your server, you can start it using the listen method.

```javascript
server.listen(8080, 'localhost', () => {
  console.log('Server is running on port 8080');
});
```

In this example, the server listens on port 8080 and the 'localhost' hostname. You can change these values as needed.

## Responding to Requests

Inside the requestListener, you can use various response methods to send data back to the client. Here are some commonly used methods:

### Redirect
```javascript
res.redirect(301, '/new-location');
```

### Set HTTP Status Code
```javascript
res.status(200);
```
### Send JSON
```javascript
res.json({ message: 'Hello, World!' });
```

### Handling Static Assets

imagic-web-server allows you to serve static assets, such as HTML, CSS, and JavaScript files. Simply add the asset configurations when creating the WebServer instance.
```javascript
assets: [
  { route: '/static', dir: 'public' },
]
```

In this example, any request to /static will be served from the public directory.
If the requested asset exists, it will be served. If not, a 404 response will be sent.
Feel free to customize the asset configuration to match your project's structure.

## Conclusion

imagic-web-server is a versatile and easy-to-use web server module for Node.js. It enables you to create a custom HTTP server with routes, middlewares, and static asset serving. Use the provided examples and adapt them to your specific needs to build powerful web applications.