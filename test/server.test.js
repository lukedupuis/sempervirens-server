import { expect } from 'chai';
import superagent from 'superagent';
import { join } from 'path';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

import Server from '../index.js';

const isCiTest = process.argv.includes('--isCiTest') ? ' --isCiTest' : '';

describe('1. Server', () => {

  describe('1.1. When required properties are not passed to constructor', () => {
    // return;

    describe('1.1.1. When "sites" is falsey or is an empty array', () => {
      it('1.1.1.1. Should throw an error', () => {
        try {
          new Server();
        } catch(err) {
          expect(err.message).to.equal('"sites" is required.');
        }
        try {
          new Server({ sites: [] });
        } catch(err) {
          expect(err.message).to.equal('"sites" is required.');
        }
      });
    });

  });

  describe('1.2. When the server instance is started without SSL', () => {
    // return;

    const server = new Server({
      port: 8080,
      sites: [{ domain: 'site-1' }]
    });
    server.start({ suppressLog: true });

    it('1.2.1. Should make the site available at http://{domain}', async () => {
      const { status, text } = await superagent.get('http://site-1:8080');
      expect(status).to.equal(200);
      expect(text).to.include('<title>Site 1</title>');
    });

    it('1.2.2. Should make the site available at http://www.{domain}', async () => {
      const { status, text } = await superagent.get('http://site-1:8080');
      expect(status).to.equal(200);
      expect(text).to.include('<title>Site 1</title>');
    });

    it('1.2.3. Should make the site available at http://localhost/{domain}', async () => {
      const { status, text } = await superagent.get('http://localhost:8080/site-1');
      expect(status).to.equal(200);
      expect(text).to.include('<title>Site 1</title>');
    });

  });

  describe('1.3. When "enableRedirectToWww" is true', () => {
    // return;

    const server = new Server({
      port: 8081,
      enableRedirectToWww: true,
      sites: [{ domain: 'site-1' }]
    });
    server.start({ suppressLog: true });

    it('1.3.1. Should redirect to "www.{domain}"', async () => {
      const { status, text, redirects } = await superagent.get('http://site-1:8081');
      expect(status).to.equal(200);
      expect(text).to.include('<title>Site 1</title>');
      expect(redirects[0]).to.include('http://www.site-1:8081');
    });

  });

  describe('1.4. When server-level middleware is added to the app', () => {
    // return;

    const server = new Server({
      port: 8082,
      sites: [
        { domain: 'site-1' },
        { domain: 'site-2' }
      ],
      middleware: [
        {
          path: 'GET /test-1',
          handler: (req, res, next) => {
            res.set('Custom-Header-1', 'Custom header 1 value');
            next();
          }
        },
        {
          handler: (req, res, next) => {
            res.set('Custom-Header-2', 'Custom header 2 value');
            next();
          }
        }
      ]
    });
    server.start({ suppressLog: true });

    describe('1.4.1. When "path" is included', () => {
      // return;

      it('1.4.1.1. Should apply the middleware to the specified path on all sites', async () => {
        // return;
        const { text: text1, headers: headers1 } = await superagent.get('http://localhost:8082/site-1/test-1');
        expect(text1).to.include('This is site-1.');
        expect(headers1['custom-header-1']).to.equal('Custom header 1 value');
        const { text: text2, headers: headers2 } = await superagent.get('http://localhost:8082/site-2/test-1');
        expect(text2).to.include('This is site-2.');
        expect(headers2['custom-header-1']).to.equal('Custom header 1 value');
      });

      it('1.4.1.2. Should not apply the middleware to the request at other paths on any site', async () => {
        // return;
        const { text: text1, headers: headers1 } = await superagent.get('http://localhost:8082/site-1');
        expect(text1).to.include('This is site-1.');
        expect(headers1['custom-header-1']).not.to.exist;
        const { text: text2, headers: headers2 } = await superagent.get('http://localhost:8082/site-2');
        expect(text2).to.include('This is site-2.');
        expect(headers2['custom-header-1']).not.to.exist;
      });

    });

    describe('1.4.2. When "path" is not included', () => {
      // return;
      it('1.4.2.1. Should apply the middleware to the request on all paths on all sites', async () => {
        const { text: text1, headers: headers1 } = await superagent.get('http://localhost:8082/site-1');
        expect(text1).to.include('This is site-1.');
        expect(headers1['custom-header-2']).to.equal('Custom header 2 value');
        const { text: text2, headers: headers2 } = await superagent.get('http://localhost:8082/site-1/test-1');
        expect(text2).to.include('This is site-1.');
        expect(headers2['custom-header-2']).to.equal('Custom header 2 value');

        const { text: text3, headers: headers3 } = await superagent.get('http://localhost:8082/site-2');
        expect(text3).to.include('This is site-2.');
        expect(headers3['custom-header-2']).to.equal('Custom header 2 value');
        const { text: text4, headers: headers4 } = await superagent.get('http://localhost:8082/site-2/test-1');
        expect(text4).to.include('This is site-2.');
        expect(headers4['custom-header-2']).to.equal('Custom header 2 value');
      });
    });

  });

  describe('1.5. When the server instance is started with SSL', () => {
    // return;

    execSync('node pems create', { cwd: './security/ssl' });

    const server = new Server({
      port: 8083,
      enableRedirectToHttps: true,
      sites: [{ domain: 'site-1' }],
      sslPaths: {
        key: join(process.cwd(), 'security/ssl/server-key.pem'),
        cert: join(process.cwd(), 'security/ssl/server-crt.pem'),
        ca: join(process.cwd(), 'security/ssl/ca-crt.pem')
      }
    });
    server.start({ suppressLog: true });

    it('1.5.1. Should make the site available at https://{domain}', async () => {
      const { status, text } = await superagent
        .get('https://site-1:8083')
        .ca(readFileSync(join(process.cwd(), 'security/ssl/ca-crt.pem')));
      expect(status).to.equal(200);
      expect(text).to.include('<title>Site 1</title>');
      expect(true).to.be.true;
    });

    describe('1.5.1.1. When "enableRedirectToHttps" is true', () => {
      it('1.5.1.1.1. Should redirect to https', async () => {
        const { status, text, redirects } = await superagent
          .get('http://site-1')
          .ca(readFileSync(join(process.cwd(), 'security/ssl/ca-crt.pem')));
        expect(status).to.equal(200);
        expect(text).to.include('<title>Site 1</title>');
        expect(redirects[0]).to.include('https://site-1:8083');
      });
    });

    after(() => execSync(`node pems delete${isCiTest}`, { cwd: './security/ssl' }));

  });

  describe('1.6. When "stop" is called', () => {
    // return;

    const server = new Server({
      port: 8085,
      sites: [{ domain: 'site-1' }]
    });
    server.start({ suppressLog: true });

    it('1.6.1. Should stop the server', async () => {
      const { status, text } = await superagent.get('http://site-1:8085');
      expect(status).to.equal(200);
      expect(text).to.include('<title>Site 1</title>');
      await server.stop();
      try {
        await superagent.get('http://site-1:8085');
      } catch({ code }) {
        expect(code).to.equal('ECONNREFUSED');
      }
    });

  });

  describe('1.7. When only one site is given in "sites"', () => {
    // return;

    const server = new Server({
      port: 8086,
      sites: [{ domain: 'site-1' }]
    });
    server.start({ suppressLog: true });

    it('1.7.1. Should load the site on "http(s)://localhost"', async () => {
      const { status, text } = await superagent.get('http://localhost:8086');
      expect(status).to.equal(200);
      expect(text).to.include('<title>Site 1</title>');
    });

  });

  after(() => setTimeout(() => process.exit(), 100));

});
