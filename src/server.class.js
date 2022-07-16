import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import https from 'https';
import { readFileSync } from 'fs';
import SiteLoader from '@sempervirens/site-loader';

class Server {

  #isProd;
  #port;
  #sslPaths;
  #corsOptions;
  #enableRedirectToWww;
  #enableRedirectToHttps;
  #httpRedirectServerPort;
  #sitesDir;
  #sites;
  #middleware;

  #hasSsl;
  #server;
  #httpRedirectApp;
  #httpRedirectServer;
  #sockets;

  app;

  constructor({
    isProd = false,
    port,
    sslPaths = { key: '', cert: '', ca: [] },
    corsOptions = {},
    enableRedirectToWww = false,
    enableRedirectToHttps = false,
    httpRedirectServerPort = 80,
    sitesDir = 'sites',
    sites = [],
    middleware = []
  } = {}) {
    this.#isProd = isProd;
    this.#sslPaths = sslPaths;
    this.#hasSsl = !!sslPaths.key && !!sslPaths.cert;
    this.#port = port || (this.#hasSsl ? 443 : 80);
    this.#corsOptions = corsOptions;
    this.#enableRedirectToWww = enableRedirectToWww;
    this.#enableRedirectToHttps = this.#hasSsl && enableRedirectToHttps;
    this.#httpRedirectServerPort = httpRedirectServerPort;
    this.#sitesDir = sitesDir;
    this.#sites = sites;
    this.#middleware = middleware;
    this.#validate();
    this.#init();
  }

  #validate() {
    if (!this.#sites || this.#sites.length == 0) {
      throw new Error('"sites" is required.');
    }
  }

  #init() {
    this.#initInstanceProperties();
    this.#initSecurity();
    this.#initParsers();
    this.#initRequestProperties();
    this.#initRedirectToHttps();
    this.#initRedirectToWww();
    this.#initMiddleware();
  }

  #initInstanceProperties() {
    this.app = express();
    this.#httpRedirectApp = this.#enableRedirectToHttps ? express() : null;
  }

  #initSecurity() {
    this.app.use(helmet());
    this.#httpRedirectApp?.use(helmet());
    this.app.use(cors(this.#corsOptions));
    this.#httpRedirectApp?.use(cors(this.#corsOptions));
  }

  #initParsers() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(compression());
    this.#httpRedirectApp?.use(express.json());
    this.#httpRedirectApp?.use(express.urlencoded({ extended: true }));
    this.#httpRedirectApp?.use(compression());
  }

  #initRequestProperties() {
    const setReqProperties = (req, res, next) => {
      req.fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      if (req.fullUrl.charAt(req.fullUrl.length - 1) == '/') {
        req.fullUrl = req.fullUrl.slice(0, -1);
      }
      next();
    };
    this.app.use(setReqProperties);
     this.#httpRedirectApp?.use(setReqProperties);
  }

  #initRedirectToHttps() {
    if (!this.#enableRedirectToHttps) return;
    this.#httpRedirectApp.use((req, res) => {
      let url = ['https://', req.hostname];
      if (this.#port != 443) url.push(':', this.#port);
      url.push(req.originalUrl);
      url = url.join('');
      if (url.charAt(url.length - 1) == '/') url = url.slice(0, -1);
      res.redirect(301, url);
    });
  }

  #initRedirectToWww() {
    if (!this.#enableRedirectToWww) return;
    const redirect = (req, res, next) => {
      if (req.hostname?.includes('www')) {
        next();
      } else {
        res.redirect(301, req.fullUrl.replace('//', '//www.'));
      }
    };
    this.app.use(redirect);
    this.#httpRedirectApp?.use(redirect);
  }

  #initMiddleware() {
    this.#middleware.forEach(middleware => {
      const { handler, path } = middleware;
      if (path) {
        const [ method, _path ] = path.split(' ');
        const __path = `*${_path.charAt(0) == '/' ? _path : `/${_path}`}`;
        this.app[method.toLowerCase()](__path, (req, res, next) => handler(req, res, next));
      } else {
        this.app.use((req, res, next) => handler(req, res, next));
      }
    });
  }

  // Start

  start({
    message,
    suppressLog
  } = {
    message: '',
    suppressLog: false
  }) {
    this.#loadSites();
    this.#createServers();
    this.#startServers({ message, suppressLog });
  }

  #loadSites() {
    if (this.#sites.length == 1) {
      this.app.use((req, res, next) => {
        req.isSite = true;
        next();
      });
    }
    this.#sites.forEach(site => {
      new SiteLoader({
        isProd: this.#isProd,
        sitesDir: this.#sitesDir,
        ...site
      }).load(this.app);
    });
  }

  #createServers() {
    if (this.#hasSsl) {
      const { key, cert, ca } = this.#sslPaths;
      const options = {
        key: readFileSync(key, 'utf8'),
        cert: readFileSync(cert, 'utf8')
      };
      if (ca?.length > 0) {
        options.ca = Array.isArray(ca)
          ? ca.map(path => readFileSync(path, 'utf8'))
          : readFileSync(ca, 'utf8');
      }
      this.#server = https.createServer(options, this.app);
      if (this.#enableRedirectToHttps) {
        this.#httpRedirectServer = http.createServer(this.#httpRedirectApp);
      }
    } else {
      this.#server = http.createServer(this.app);
    }
  }

  #startServers({
    message,
    suppressLog
  } = {
    message: '',
    suppressLog: false
  }) {
    const logMessage = (protocol, port) => {
      if (suppressLog) return;
      if (message) {
        console.log(message);
      } else {
        console.log('-------');
        console.log(`${protocol.toUpperCase()} server listening on port ${port}`);
        console.log(`Serving ${this.#sites.map(({ domain }) => domain).join(', ')}`);
        console.log('-------');
      }
    };
    const initSockets = server => {
      server.on('connection', socket => {
        this.#sockets.add(socket);
      });
    };
    this.#sockets = new Set();
    if (this.#hasSsl) {
      this.#server.listen(this.#port, () => logMessage('https', this.#port));
      initSockets(this.#server);
      if (this.#enableRedirectToHttps) {
        this.#httpRedirectServer.listen(this.#httpRedirectServerPort);
        initSockets(this.#httpRedirectServer);
      }
    } else {
      this.#server.listen(this.#port, () => logMessage('http', this.#port));
      initSockets(this.#server);
    }
  }

  // Stop

  async stop() {
    const stop = (server) => {
      for (const socket of this.#sockets) {
        socket.destroy();
        this.#sockets.delete(socket);
      }
      return new Promise(resolve => server.close(resolve));
    };
    return await Promise.all([
      stop(this.#server),
      this.#enableRedirectToHttps
        ? stop(this.#httpRedirectServer)
        : Promise.resolve()
    ]);
  }

}

export default Server;
