# rollup-plugin-resolve-id

Rollup plugin for resolves module by using aliases and file extensions,
Also resolves the file when importing a directory. Migrate from [rollup-plugin-resolve2](https://www.npmjs.com/package/rollup-plugin-resolve2)

**(sync with webpack resolve specs)**

## Install

```bash
yarn add --dev rollup-plugin-resolve-id
```

## Options

```js
import importResolver from "rollup-plugin-resolve-id";

importResolver({
  // a list of file extensions to check, default = ['.js']
  extensions: ['.js', '.vue'],
  // a list of aliases, default = {}
  alias: {
    'lib': './node_modules/otherlib/src'
  },
  // index file name without extension, default = 'index'
  indexFile: 'index'
});

// if called without options, the defaults are
defaultOptions = {
  extensions: ['js'],
  alias: {},
  indexFile: 'index'
};
```

## Usage scenarios

Consider the following project structure

    |-- .. 
    '-- src
       |-- ..
       |-- index.js
       '-- utils
           |-- ..
           |-- util1.js
           |-- util2.jsm
           '-- index.js


and plugin options

```json
{
  "extensions": [".js", ".jsm"],
  "alias": {
    "somelib": "./node_modules/other_lib/src/"
  }
}
```

### Resolve "index" file if import points to a directory

```js
// src/index.js

import * as utils from "./utils"; 
// resolved to ./utils/index.js
```

### Resolve extensions

```js
// src/utils/index.js

import util1 from "./util1"; 
// resolved to ./util1.js
import util2 from "./util2"; 
// resolved to ./util2.jsm

export {util1 as u1, util2 as u2};
```

### Resolve aliases

```js
// src/utils/util1.js

import somelib from "somelib";
// resolved to ./node_modules/other_lib/src/index.js

import component1 from "somelib/component1";
// resolved to ./node_modules/other_lib/src/component1.js
// OR if component1 is a folder ./node_modules/other_lib/src/component1/index.js
```
