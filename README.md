# Joey the Differ

JSON diffing on steroids.

## 🧬 Installation

```shell
npm install joey-the-differ
```

## 🧬 Usage

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
        reason: 'number of stars decreased',
      },
    }),
    'genres\\.(\\d+)\\.name': (source, target) => ({
      areEqual: source.toLowerCase() === target.toLowerCase(),
      meta: {
        reason: 'different genre names in lower case',
      },
    }),
  },
};

const joey = new JoeyTheDiffer(options);

const changes = joey.diff(currentBookData, newBookData);

console.log(changes);
/*
[
  {
    path: 'author.life.bornOn',
    source: '3 May 1469',
    target: undefined,
    meta: {
      reason: 'value disappeared',
    },
  },
  {
    path: 'author.life.diedOn',
    source: '21 June 1527',
    target: '21 June 1532',
    meta: {
      reason: 'different strings',
    },
  },
  {
    path: 'author.life.bornIn',
    source: undefined,
    target: 'Firenze',
    meta: {
      reason: 'value appeared',
    },
  },
  {
    path: 'publishedOn',
    source: '1532',
    target: 1532,
    meta: {
      reason: 'type changed from "string" to "number"',
    },
  },
  {
    path: 'starsCount',
    source: 8562,
    target: 1,
    meta: {
      reason: 'number of stars decreased',
    },
  },
  {
    path: 'genres.0.name',
    source: 'classics',
    target: 'CLASSIC',
    meta: {
      reason: 'different genre names in lower case',
    },
  },
  {
    path: 'genres.1.id',
    source: 93,
    target: undefined,
    meta: {
      reason: 'value disappeared',
    },
  },
  {
    path: 'genres.2',
    source: undefined,
    target: {
      id: 1,
      name: 'HISTORY',
    },
    meta: {
      reason: 'value appeared',
    },
  },
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

Compares `source` to `target` by recursively visiting all `source` properties and diffing them with the corresponding properties in `target`. If a `blacklist` option was passed, the regular expressions are used to prevent diffing specific `source` properties identified by their path.

If `allowNewTargetProperties` was set to `true`, properties that exist in `target` but not in `source`will not appear in the results.

If custom differs were passed, they will be used to compare the `source` and `target` properties matched by the regular expressions provided.

All JSON primitive values will be compared using strict equality (`===`).

```js
const results = joey.diff(source, target);
```

`results` is an array of differences where each element is like:

```js
{
  path: 'path.to.value',
  source: 'source value',
  target: 'target value',
  meta: {
    reason: 'an explanation of why the source and target values are not equal',
    // any other value returned by your custom differs or by Joey the Differ in the future
  },
}
```

## 🧬 Contribute

- Fork: `git clone https://github.com/mawrkus/node-package.git`
- Create your feature branch: `git checkout -b feature/my-new-feature`
- Commit your changes: `git commit -am 'Added some feature'`
- Check the test: `npm run test`
- Push to the branch: `git push origin my-new-feature`
- Submit a pull request :D
