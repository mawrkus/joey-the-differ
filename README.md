# Joey the Differ

JSON diffing on steroids.

## 🧬 Installation

```shell
npm install joey-the-differ
```

## 🧬 Usage

### Command line

```text
Usage: joey-the-differ [options]

Options:
  -V, --version        output the version number
  -s, --source [file]  source file or directory, required
  -t, --target [file]  target file or directory, required
  -o, --output [file]  output file or directory, optional
  -c, --config [file]  config file (JS), optional
  -v, --verbose        verbose mode, optional
  -h, --help           display help for command
```

For instance, using [npx](https://github.com/npm/npx):

```shell
npx joey-the-differ -s demo/source.json -t demo/target.json -c demo/options.js
```

or using [Docker](https://www.docker.com/why-docker):

```shell
docker build . -t mawrkus/joey-the-differ
docker run -v ${PWD}:/tmp mawrkus/joey-the-differ -s /tmp/demo/source.json -t /tmp/demo/target.json -c /tmp/demo/options.js
```

Have a look at the [demo folder](./demo) to see the content of the files.

#### Bulk diffing

You can diff one `source` file against many, if `target` is a directory:

```shell
npx joey-the-differ -s demo/bulk/sources/1.json -t demo/bulk/targets -c demo/options.js
```

or many files against one `target` file, if `source` is a directory:

```shell
npx joey-the-differ -s demo/bulk/sources -t demo/bulk/targets/1.json -c demo/options.js
```

or you can diff matching pairs of files if `source` and `target` are directories:

```shell
npx joey-the-differ -s demo/bulk/sources -t demo/bulk/targets -c demo/options.js
```

In this case, the files with the same name in both `source` and `target` directories will be diffed.

`output` can be either a file or a directory. In case of a directory, for each file matched, a file with the same name will be created.

### Node.js module

```js
import JoeyTheDiffer from 'joey-the-differ';

const currentBookData = {
  id: 42,
  title: 'The Prince',
  author: {
    name: 'Niccolò',
    surname: 'Machiavelli',
    life: {
      bornOn: '3 May 1469',
      diedOn: '21 June 1527',
    },
  },
  publishedOn: '1532',
  reviewsCount: 9614,
  starsCount: 8562,
  genres: [{
    id: 4,
    name: 'classics',
  }, {
    id: 93,
    name: 'philosophy',
  }],
};

const newBookData = {
  id: 42,
  title: 'The Prince',
  author: {
    name: 'Niccolò',
    surname: 'Machiavelli',
    life: {
      diedOn: '21 June 1532',
      bornIn: 'Firenze',
    },
  },
  publishedOn: 1532,
  starsCount: null,
  genres: [{
    id: 4,
    name: 'CLASSIC',
  }, {
    name: 'PHILOSOPHY',
    booksCount: 843942,
  }, {
    id: 1,
    name: 'HISTORY',
  }],
};

const options = {
  allowNewTargetProperties: false,
  blacklist: [
    'reviewsCount',
    'genres\\.(\\d+)\\.booksCount',
  ],
  preprocessors: {
    starsCount: (source, target) => ({
      source: source || 0,
      target: target || 0,
    }),
  },
  differs: {
    'starsCount': (source, target) => ({
      areEqual: source <= target,
      meta: {
        op: 'replace',
        reason: 'number of stars decreased',
        delta: target - source,
      },
    }),
    'genres\\.(\\d+)\\.name': (source, target) => ({
      areEqual: source.toLowerCase() === target.toLowerCase(),
      meta: {
        op: 'replace',
        reason: 'different genre names in lower case',
      },
    }),
  },
};

const joey = new JoeyTheDiffer(options);

const changes = joey.diff(currentBookData, newBookData);

// or with files:
// const [{ changes }] = await joey.diffFiles('./demo/source.json', '.demo/target.json');

console.log(changes);
/*
[
  {
    "path": "author.life.bornOn",
    "source": "3 May 1469",
    "meta": {
      "op": "remove",
      "reason": "value disappeared"
    }
  },
  {
    "path": "author.life.diedOn",
    "source": "21 June 1527",
    "target": "21 June 1532",
    "meta": {
      "op": "replace",
      "reason": "different strings"
    }
  },
  {
    "path": "author.life.bornIn",
    "target": "Firenze",
    "meta": {
      "op": "add",
      "reason": "value appeared"
    }
  },
  {
    "path": "publishedOn",
    "source": "1532",
    "target": 1532,
    "meta": {
      "op": "replace",
      "reason": "type changed from \"string\" to \"number\""
    }
  },
  {
    "path": "starsCount",
    "source": 8562,
    "target": null,
    "meta": {
      "op": "replace",
      "reason": "number of stars decreased",
      "delta": -8562,
      "preprocessor": {
        "source": 8562,
        "target": 0
      }
    }
  },
  {
    "path": "genres.0.name",
    "source": "classics",
    "target": "CLASSIC",
    "meta": {
      "op": "replace",
      "reason": "different genre names in lower case"
    }
  },
  {
    "path": "genres.1.id",
    "source": 93,
    "meta": {
      "op": "remove",
      "reason": "value disappeared"
    }
  },
  {
    "path": "genres.2",
    "target": {
      "id": 1,
      "name": "HISTORY"
    },
    "meta": {
      "op": "add",
      "reason": "value appeared"
    }
  }
]
*/
```

## 🧬 API

### constructor options

| Name  | Type  | Default | Description | Example |
| ---   | ---   | ---     | ---         | ---     |
| `allowNewTargetProperties` | Boolean | false | To allow or not diffing properties that exist in `target` but not in `source` | |
| `blacklist` | String[] | [] | An array of regular expressions used to match specific properties identified by their path | `'genres\\.(\\d+)\\.booksCount'` will prevent diffing the `booksCount` property of all the `genres` array elements (objects) |
| `preprocessors` | Object | {} | Preprocessors, associating a regular expression to a transform function  | See "Usage" above |
| `differs` | Object | {} | Custom differs, associating a regular expression to a diffing function  | See "Usage" above |

### diff(source, target)

Compares `source` to `target` by recursively visiting all `source` properties and diffing them with the corresponding properties in `target`.

If a `blacklist` option is passed, it is used to prevent diffing specific properties identified by their path, in `source` and in `target`.

If `allowNewTargetProperties` is set to `true`, the properties that exist in `target` but not in `source` won't appear in the changes.

If custom differs are passed, they are used to compare the `source` and `target` properties matched by the regular expressions provided.

If preprocessors are passed, they act prior to diffing, to transform the `source` and `target` values matched by the regular expressions provided.

All JSON primitive values will be compared using strict equality (`===`).

```js
const changes = joey.diff(source, target);
```

`changes` is an array of differences where each element is like:

```js
{
  path: 'path.to.value',
  source: 'source value',
  target: 'target value',
  meta: {
    op: 'the operation that happened on the value: add, remove, or replace',
    reason: 'an explanation of why the source and target values are not equal',
    preprocessor: {
      source: 'source value after preprocessing',
      target: 'target value after preprocessing',
    },
    // ...
    // and any other value returned by your custom differs or by Joey in the future
  },
}
```

### async diffFiles(sourcePath, targetPath, optionalOutputPath)

```js
const results = await joey.diffFiles(sourcePath, targetPath, optionalOutputPath);
```

`results` is an array of objects like:

```js
[
  {
    source: 'path to the source file',
    target: 'path to the target file',
    changes: [
      // see above
    ],
  },
  {
    // ...
  },
]
```

You can diff:

- one `source` file against many, if `target` is a directory
- many source files against one `target`, if `source` is a directory
- matching pairs of files if `source` and `target` are directories (the files with the same names in both `source` and `target` will be diffed)

`optionalOutputPath` can be either a file or a directory. In case of a directory, for each file matched, a file with the same name will be created. For diffing one file against one file, it must be a file.

## 🧬 Contribute

- Fork: `git clone https://github.com/mawrkus/node-package.git`
- Create your feature branch: `git checkout -b feature/my-new-feature`
- Commit your changes: `git commit -am 'Added some feature'`
- Check the test: `npm run test`
- Push to the branch: `git push origin my-new-feature`
- Submit a pull request :D
