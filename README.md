# Helic Universal Development Server

> Development server for local development of helix universal functions

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-universal-devserver.svg)](https://codecov.io/gh/adobe/helix-universal-devserver)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/adobe/helix-universal-devserver/main.yaml)](https://github.com/adobe/helix-universal-devserver/actions/workflows/main.yaml)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-universal-devserver.svg)](https://github.com/adobe/helix-universal-devserver/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-universal-devserver.svg)](https://github.com/adobe/helix-universal-devserver/issues)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Installation

```bash
$ npm install @adobe/helix-universal-devserver
```

## Usage

```
// test/dev.js

import { DevelopmentServer } from '@adobe/helix-universal-devserver';
import { main } from '../src/index.js';

async function run() {
 const devServer = await new DevelopmentServer(main).init();
 await devServer.start();
}

run().then(process.stdout).catch(process.stderr);
```

### Test Helix Deploy Bundle

sometimes it is useful to test a bundled universal function directly, for example to verify that
all imports are properly resolved. This can be achieved by setting the `adapter`, either to
`lambda` or `lambda.raw`. the later bypasses loading of the secrets.

```js
import { lambda } from '../../dist/helix-services/simple-function@2.4.44-bundle.cjs';

async function run() {
  const devServer = await new DevelopmentServer()
    .withHeader('x-forwarded-host', 'localhost:{port}')
    .withAdapter(lambda.raw) // use raw adapter and don't load secrets
    .init();
  await devServer.start();
}
```

### Using development params with the server

Sometimes it might be useful to specify action params that would be provided during deployment
but are not available during development. Those can be specified using the `hlx` configuration
in your `package.json`. The development server will load parameters from:

1. `hlx.package.params-file` and `hlx.package.params`
2. `hlx.params-file` and `hlx.params`
3. `hlx.dev.params-file` and `hlx.dev.params` (overrides the above)

Example using `hlx` (recommended):

```json5
{
  // ...
  "hlx": {
    "name": "my-action@${version}",
    "params-file": [
      "secrets.env"
    ],
    "params": {
      "MY_PARAM": "value"
    },
    "package": {
      "params-file": [
        "package-secrets.env"
      ],
      "params": {
        "PACKAGE_PARAM": "package-value"
      }
    },
    "dev": {
      "params-file": [
        ".dev-secrets.env"
      ],
      "params": {
        "DEV_PARAM": "dev-value"
      }
    }
  }
  // ...
}
```

**Note:** The deprecated `wsk` configuration key is still supported for backwards compatibility,
but `hlx` is now the recommended standard. If both are present, `hlx` takes precedence.
See the [helix-deploy documentation](https://github.com/adobe/helix-deploy?tab=readme-ov-file#specifying-arguments-in-the-packagejson) for more details.

## Development

### Build

```bash
$ npm install
```

### Test

```bash
$ npm test
```

### Lint

```bash
$ npm run lint
```
