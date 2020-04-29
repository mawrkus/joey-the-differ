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
  -s, --source [file]  source file (JSON), required
  -t, --target [file]  target file (JSON), required
  -c, --config [file]  config file (JS), optional
```

For instance, using [npx](https://github.com/npm/npx):

```shell
npx joey-the-differ -s demo/source.json -t demo/target.json -c demo/options.js
```

os using [Docker](https://www.docker.com/why-docker)
```shell
docker run -v ${PWD}:/tmp mawrkus/joey-the-differ -s /tmp/demo/source.json -t /tmp/demo/target.json -c /tmp/demo/options.js
```

Have a look at the [demo folder](./demo) to see the content of the files.

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
  starsCount: 1,
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
  blacklist: [
    'reviewsCount',
    'genres\\.(\\d+)\\.booksCount',
  ],
  allowNewTargetProperties: false,
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
// const changes = await joey.diffFiles('./demo/source.json', '.demo/target.json');

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
    "target": 1,
    "meta": {
      "op": "replace",
      "reason": "number of stars decreased",
      "delta": -8561
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
| `blacklist` | String[] | [] | An array of regular expressions used to match specific `source` properties identified by their path | `'genres\\.(\\d+)\\.booksCount'` will prevent diffing the `booksCount` property of all the `genres` array elements (objects) |
| `allowNewTargetProperties` | Boolean | false | To allow or not diffing properties that exist in `target` but not in `source` | |
| `differs` | Object | {} | Custom differs, associating a regular expression to a diffing function  | See "Usage" above |

### diff(source, target)

Compares `source` to `target` by recursively visiting all `source` properties and diffing them with the corresponding properties in `target`. If a `blacklist` option was passed, it is used to prevent diffing specific `source` properties identified by their path.

If `allowNewTargetProperties` is set to `true`, the properties that exist in `target` but not in `source` don't appear in the changes.

If custom differs are passed, they are used to compare the `source` and `target` properties matched by the regular expressions provided.

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
    // ...
    // and any other value returned by your custom differs or by Joey in the future
  },
}
```

### diffFiles(sourcePath, targetPath)

A helper method to work with files.

```js
const changes = await joey.diff(sourcePath, targetPath);
```

## 🧬 Contribute

- Fork: `git clone https://github.com/mawrkus/node-package.git`
- Create your feature branch: `git checkout -b feature/my-new-feature`
- Commit your changes: `git commit -am 'Added some feature'`
- Check the test: `npm run test`
- Push to the branch: `git push origin my-new-feature`
- Submit a pull request :D
