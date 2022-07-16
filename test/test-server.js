import { RequestHandler } from '@sempervirens/endpoint';

import Server from '../index.js';

// Examples only, separate files recommended, or a plain function may be used
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

  /**
   * @param {Object} [sslPaths] Optional. Default: { key: '', cert: '', ca: [] }.
   * @description Optional. If "sslPaths" is given, then sites are loaded on
   * "https" at "443" instead of "http" on port "80".
   */
  // sslPaths: { key: '', cert: '', ca: [] },

  /**
   * @param {number} [port] Optional. Default: 80 or 443
   * @description Optional. The port to start the server on. The default server
   * port is 80. If "sslPaths" is valid, then the default server port is 443.
   */
  // port: 80,

  /**
   * @param {Object} [corsOptions] Optional. Default: {}.
   * @description Optional. See NPM cors configuration options.
   */
  // corsOptions: {},

  /**
   * @param {boolean} [enableRedirectToWww] Optional. Default: false.
   * @description Optional. If "enableRedirectToWww" is true, then when a
   * request arrives at "http(s)://{domain}", it is redirected to
   * "http(s)://www.{domain}".
   */
  // enableRedirectToWww: false,

  /**
   * @param {boolean} [enableRedirectToHttps] Optional. Default: false.
   * @description Optional. If "enableRedirectToHttps" is true, then when a
   * request arrives at "http://{domain}", it is redirected to
   * "https://{domain}". "sslPaths" is required for "enableRedirectToHttps" to
   * redirect.
   */
  // enableRedirectToHttps: false,

  /**
   * @param {string} [sitesDir] Optional. Default: 'sites'.
   * @description Sets the name of the {root}/{sites} directory where all of the
   * website folders are located.
   */
  // sitesDir: 'sites',

  /**
   * @param {Object[]} sites Required.
   * @description Each object is passed into the SiteLoader constructor. See
   * @sempervirens/site-loader for more information.
   * When the the server starts:
   * - Sites become available for local development at
   *   "http://localhost/{domain}".
   * - If only one site is given, then the site becomes available at
   *   "http://localhost" as well.
   * - Sites are also available at "http://{domain}", primarily for making them
   *   available online.
   * - (If an entry has been added to the local OS's "hosts" file, then the site
   *   will load locally at "http://{domain}", too.)
   */
  sites: [
    // All requests to site-1 load only index.html.
    {
      domain: 'site-1'
    },
    // Requests to site-2 load index.html and one API endpoint at {domain}/my-api/v1/test-1
    {
      domain: 'site-2',
      apiBasePath: 'my-api', // Default is 'api'
      endpoints: [
        {
          path: 'GET /my-api/v1/test-1',
          handler: Test1RequestHandler
        },
        {
          path: 'GET /page-1',
          handler: ({ req, res, isSecure }) => {
            // Endpoint handlers should always send a response.
            // The send() method on the RequestHandler class returns the response in a standardized format.
            // The RequestHandler class also uses @sempervirens/authorizer for easy endpoint authorization.
            // The following returns a simple SSR HTML page.
            res.send(`<html><head><title>Site 1</title><body>Full URL: ${req.fullUrl}</body></html>`);
          }
        }
      ],
      // Site-level middleware
      // middleware: [{ path: '', handler: (req, res, next) => { next(); } }]
    }
  ]

  /**
   * @param {Object[]} [middleware] Optional. Default: [].
   * @description Adds server-level middleware to requests for all sites before
   * the endpoints are called. If "path" is given, then it only adds the
   * middleware to specified path. Otherwise, it adds the middleware to all
   * paths.
   */
  // middleware: [{ path: 'GET /path-1', handler: (req, res, next) => { next(); } }]

});

/**
 * @function start
 * @param {string} [message] Optional. A message to display when the server starts
 * @param {boolean} [suppressLog] Optional. Silently starts the server
 */
server.start({
  message: '',
  suppressLog: false
});
