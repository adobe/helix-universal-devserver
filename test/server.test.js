/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */
import assert from 'assert';
import { resolve } from 'path';
import { h1NoCache, Response } from '@adobe/fetch';
import { DevelopmentServer } from '../src/index.js';

const { fetch } = h1NoCache();

describe('Server Test', () => {
  let envCopy;
  let server;

  beforeEach(() => {
    envCopy = { ...process.env };
  });

  afterEach(async () => {
    process.env = envCopy;
    await server?.stop();
    server = null;
  });

  it('it can start an stop the server', async () => {
    const main = (req, ctx) => {
      const body = {
        ...ctx.runtime,
      };
      Object.entries(ctx.env).forEach(([key, value]) => {
        if (key.startsWith('TEST_') && key.endsWith('_PARAM')) {
          body[key] = value;
        }
      });

      return new Response(JSON.stringify(body), {
        headers: {
          'content-type': 'application/json',
        },
      });
    };
    server = await new DevelopmentServer(main)
      .withPort(0)
      .withDirectory(resolve(__rootdir, 'test', 'fixtures', 'server-test'))
      .init();
    server.params.TEST_DIRECT_PARAM = 'foo-direct-param';
    await server.start();

    const res = await fetch(`http://localhost:${server.port}/`);
    assert.deepStrictEqual(await res.json(), {
      accountId: 'no-account',
      name: 'simulate',
      region: 'us-east-1',
      TEST_DEFAULT_PARAM: 'dev-default',
      TEST_DEV_FILE_PARAM: 'foo-dev-file',
      TEST_DEV_PARAM: 'foo-dev-param',
      TEST_DIRECT_PARAM: 'foo-direct-param',
      TEST_FILE_PARAM: 'foo-file',
      TEST_PACKAGE_FILE_PARAM: 'foo-package-file',
      TEST_PACKAGE_PARAM: 'foo-package-param',
      TEST_PARAM: 'foo-param',
    });
  });

  it('it rejects errors during start', async () => {
    const main = () => new Response('hello.');
    server = await new DevelopmentServer(main)
      .withPort(0)
      .init();
    await server.start();
    const res = await fetch(`http://localhost:${server.port}/`);
    assert.strictEqual(await res.text(), 'hello.');

    // try to start 2nd server on the same port
    const server2 = await new DevelopmentServer(main).withPort(server.port).init();
    await assert.rejects(server2.start(), Error(`listen EADDRINUSE: address already in use :::${server.port}`));
  });

  it('it rejects errors during stop', async () => {
    const main = () => new Response('hello.');
    const server2 = await new DevelopmentServer(main)
      .withPort(0)
      .init();
    await server2.start();
    await server2.stop();
    await assert.rejects(server2.stop(), Error('Server is not running.'));
  });

  it('it can set the xfh header (deprecated)', async () => {
    const main = (req) => new Response(`hello: http://${req.headers.get('x-forwarded-host')}`);
    server = await new DevelopmentServer(main)
      .withPort(0)
      .withXFH('localhost:{port}')
      .init();
    await server.start();
    const res = await fetch(`http://localhost:${server.port}/`);
    assert.strictEqual(await res.text(), `hello: http://localhost:${server.port}`);
  });

  it('it can set the custom header', async () => {
    const main = (req) => new Response(`hello: ${req.headers.get('x-forwarded-proto')}://${req.headers.get('x-forwarded-host')}`);
    server = await new DevelopmentServer(main)
      .withPort(0)
      .withHeader('x-forwarded-host', 'localhost:{port}')
      .withHeader('x-forwarded-proto', 'http')
      .init();
    await server.start();
    const res = await fetch(`http://localhost:${server.port}/`);
    assert.strictEqual(await res.text(), `hello: http://localhost:${server.port}`);
  });

  it('ignores missing dev files', async () => {
    const main = () => new Response('hello, world.');
    server = await new DevelopmentServer(main)
      .withPort(0)
      .withDirectory(resolve(__rootdir, 'test', 'fixtures', 'server-test2'))
      .init();
    await server.start();
    const res = await fetch(`http://localhost:${server.port}/`);
    assert.strictEqual(await res.text(), 'hello, world.');
  });

  it('it can post json body', async () => {
    const main = async (req) => {
      const body = await req.json();
      return new Response(`hello: ${JSON.stringify(body)}`);
    };
    server = await new DevelopmentServer(main).withPort(0).init();
    await server.start();
    const res = await fetch(`http://localhost:${server.port}/`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: { myparam: 'test' },
    });
    assert.strictEqual(await res.text(), 'hello: {"myparam":"test"}');
  });

  it('it can see the request method', async () => {
    // eslint-disable-next-line arrow-body-style
    const main = async (req) => {
      return new Response(`method: ${req.method}`);
    };
    server = await new DevelopmentServer(main).withPort(0).init();
    await server.start();
    const res = await fetch(`http://localhost:${server.port}/`, {
      method: 'OPTIONS',
    });
    assert.strictEqual(await res.text(), 'method: OPTIONS');
  });

  it('it can see the query string', async () => {
    // eslint-disable-next-line arrow-body-style
    const main = async (req) => {
      return new Response(`qs: ${new URL(req.url).searchParams}`);
    };
    server = await new DevelopmentServer(main).withPort(0).init();
    await server.start();
    const res = await fetch(`http://localhost:${server.port}/?a=1&b=2`);
    assert.strictEqual(await res.text(), 'qs: a=1&b=2');
  });

  it('it can see a query string that itself contains a question mark', async () => {
    // eslint-disable-next-line arrow-body-style
    const main = async (req) => {
      return new Response(`url: ${new URL(req.url).searchParams.get('url')}`);
    };
    server = await new DevelopmentServer(main).withPort(0).init();
    await server.start();
    const res = await fetch(`http://localhost:${server.port}/?url=http://localhost/?a=1`);
    assert.strictEqual(await res.text(), 'url: http://localhost/?a=1');
  });

  it('it can see the suffix in the pathInfo', async () => {
    // eslint-disable-next-line arrow-body-style
    const main = async (_, ctx) => {
      return new Response(`suffix: ${ctx.pathInfo.suffix}`);
    };
    server = await new DevelopmentServer(main).withPort(0).init();
    await server.start();
    const res = await fetch(`http://localhost:${server.port}/this/is/the/suffix/?not=this`);
    assert.strictEqual(await res.text(), 'suffix: /this/is/the/suffix/');
  });

  it('it supports method override', async () => {
    // eslint-disable-next-line arrow-body-style
    const main = async (req) => {
      return new Response(`method: ${req.method}`);
    };
    server = await new DevelopmentServer(main).withPort(0).init();
    await server.start();
    const res = await fetch(`http://localhost:${server.port}/`, {
      headers: {
        'x-http-method': 'RUN',
      },
    });
    assert.strictEqual(await res.text(), 'method: RUN');
  });

  it('it provides an invocation id', async () => {
    // eslint-disable-next-line arrow-body-style
    const main = async (req, context) => {
      return new Response(`id: ${context.invocation.id}`);
    };
    server = await new DevelopmentServer(main).withPort(0).init();
    await server.start();
    const res = await fetch(`http://localhost:${server.port}/`, {
      headers: {
        'x-http-method': 'RUN',
      },
    });
    assert.match(await res.text(), /id: [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
  });

  it('it can return binary content', async () => {
    // eslint-disable-next-line arrow-body-style
    const main = async (req) => {
      const chunks = [];
      for await (const chunk of req.body) {
        chunks.push(chunk);
      }
      return new Response(Buffer.concat(chunks).toString('hex'), {
        headers: {
          'content-type': 'application/octet-stream',
        },
      });
    };
    server = await new DevelopmentServer(main).withPort(0).init();
    await server.start();
    const res = await fetch(`http://localhost:${server.port}/`, {
      method: 'POST',
      body: Buffer.from('test'),
    });
    assert.strictEqual(await res.text(), '74657374');
  });

  it('resolves the action correctly', async () => {
    const main = async (req, ctx) => {
      const url = ctx.resolver.createURL({
        package: 'helix-services',
        name: 'content-proxy',
        version: 'v2',
      });
      return new Response(`xfh: ${url.href}`);
    };
    server = await new DevelopmentServer(main).withPort(0).init();
    await server.start();
    const res = await fetch(`http://localhost:${server.port}/`);
    assert.strictEqual(await res.text(), 'xfh: https://localhost/helix-services/content-proxy/v2');
  });

  it('uses a given adapter', async () => {
    const adapter = async (event) => {
      // eslint-disable-next-line no-param-reassign
      delete event.headers.host;
      assert.deepStrictEqual(event, {
        body: undefined,
        headers: {
        // "host": "localhost:51246",
          'user-agent': 'adobe-fetch/4.1.1',
          accept: '*/*',
          'accept-encoding': 'gzip,deflate,br',
          connection: 'close',
        },
        pathParameters: {
          path: '',
        },
        requestContext: {
          domainName: 'localhost',
          http: {
            method: 'GET',
          },
        },
        rawPath: '/',
        rawQueryString: '',
      });
      return {
        statusCode: 200,
        headers: {},
        body: 'hello, world',
      };
    };
    server = await new DevelopmentServer()
      .withPort(0)
      .withAdapter(adapter)
      .init();
    await server.start();
    const res = await fetch(`http://localhost:${server.port}/`);
    assert.strictEqual(await res.text(), 'hello, world');
  });

  it('handles errors in adapter', async () => {
    const adapter = async () => {
      throw new Error('boom!');
    };
    server = await new DevelopmentServer()
      .withPort(0)
      .withAdapter(adapter)
      .init();
    await server.start();
    const res = await fetch(`http://localhost:${server.port}/`);
    assert.strictEqual(res.status, 500);
    assert.strictEqual(await res.text(), 'boom!');
  });
});
