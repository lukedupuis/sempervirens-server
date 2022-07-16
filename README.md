# Sempervirens Server

An Express server system for serving one or more website(s) from one server, it provides a file structure and pre-configurations for further configuring and building out websites and APIs.

![Tests badge](https://github.com/lukedupuis/sempervirens-server/actions/workflows/main.yml/badge.svg?event=push) ![Version badge](https://img.shields.io/static/v1?label=Node&labelColor=30363c&message=16.x&color=blue)

## Installation

`npm i @sempervirens/server`

## Usage

1. Run `npm init` in a root directory, and then define the following directory structure, including one or more websites.

```
/{root}
  /node_modules
  /sites
    /site-1
      /public
        index.html
    /site-2
      /public
        index.html
  package-lock.json
  package.json
  server.js
```

2. Implement the `Server` class in the `server.js` file.

_server.js_
```
import Server from '@sempervirens/server';
import { RequestHandler } from '@sempervirens/endpoint';

class Test1RequestHandler extends RequestHandler {
  constructor({ req, res, isSecure }) {
    super({ req, res, isSecure });
    this.#init();
  }
  #init() {
    this.res.send('Success 1');
  }
}

const server = new Server({
  sites: [
    {
      domain: 'site-1'
    },
    {
      domain: 'site-2',
      endpoints: [
        {
          path: 'GET /api/test-1',
          handler: Test1RequestHandler
        },
        {
          path: 'GET /page-1',
          handler: ({ req, res, isSecure }) => {
            res.send(`<html><head><title>Site 1</title><body>Full URL: ${req.fullUrl}</body></html>`);
          }
        }
      ]
    }
  ]
});

server.start({
  message: '',
  suppressLog: false
});
```

3. Run `node server`.

```
cd {root}
node server
```

## API

### constructor

| Param  | Type | Description |
|--------|------|-------------|
| `corsOptions` | object | Optional. Default: `{}`. See NPM cors package configuration options. |
| `httpRedirectServerPort` | number | Optiona. Default `80`. Sets the HTTP server port for the HTTP to HTTPS redirect functionality. Primarily for testing. |
| `enableRedirectToHttps` | boolean | Optional. Default: `false`. If true, then when a request arrives at "http://{domain}", it is redirected to "https://{domain}". "sslPaths" is required for "enableRedirectToHttps" to redirect.|
| `enableRedirectToWww` | boolean | Optional. Default: `false`. If true, then when a request arrives at "http(s)://{domain}", it is redirected to "http(s)://www.{domain}". |
| `middleware` | object[] | Optional. Default: `[]`. Shape: `{ path?: string; handler: RequestHandler|function; }`. Adds server-level middleware to requests for all sites before the endpoints are called. If "path" is given, then it only adds the middleware to specified path. Otherwise, it adds the middleware to all paths. |
| `port` | number | Optional. Default: `80` or `443`. The port to start the server on. The default server port is 80. If "sslPaths" is valid, then the default server port is 443. |
| `sites` | object | Required. Each object is passed into the SiteLoader constructor. See `@sempervirens/site-loader` for more information. When the the server starts: - Sites become available for local development at `http://localhost/{domain}`. - If only one site is given, then the site becomes available at `http://localhost` as well. - Sites are also available at `http://{domain}`, primarily for making them available online. - (If an entry has been added to the local OS's `hosts` file, then the site will load locally at `http://{domain}`, too.) |
| `sitesDir` | string | Optional. Default: `sites`. Sets the name of the {root}/{sites} directory where all of the website folders are located. |
| `sslPaths` | object | Optional. Default: `{ key: '', cert: '', ca: [] }`. If "sslPaths" is given, then sites are loaded on `https` at `443` instead of `http` on port `80`. |

### start

Starts the server.

| Param  | Type | Description |
|--------|------|-------------|
| `message` | string | Optional. A message to display when the server starts. |
| `suppressLog` | boolean | Optional. Default: `false`. Silently starts the server. |

### stop

Stops the server.