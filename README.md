# 🧬 Joey the Differ

JSON diffing on steroids.

## Installation

```shell
npm install joey-the-differ
```

## Usage

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
    name: 'Nicolas',
    surname: 'Machiavelli',
    life: {
      diedOn: '21 June 1532',
      bornIn: 'Firenze',
    },
  },
  publishedOn: 1532,
  starsCount: 8562,
  genres: [{
    id: 4,
    name: 'classic',
  }, {
    name: 'philosophy',
    booksCount: 843942,
  }, {
    id: 1,
    name: 'history',
  }],
};

const options = {
  blacklist: ['reviewsCount', 'merchants.name'],
  diffs: {
    'author.surname': (source, target) => ({
      areEqual: source.toLowercase() === target.toLowercase(),
      meta: {
        reason: 'different lowercase strings',
      },
    }),
    'viewsCount': (source, target) => ({
      areEqual: source <= target,
      meta: {
        reason: 'value decreased',
      },
    }),
    'merchants.certified': (source, target) => ({
      areEqual: source == target,
      meta: {
        reason: 'different values after loose comparison',
      },
    }),
  },
};

const joey = new JoeyTheDiffer(options);

const results = joey.diff(currentBookData, newBookData, options);

console.log(results);

/*
[
  {
    path: 'author.name',
    source: 'Niccolò',
    target: 'Nicolas',
    meta: {
      reason: 'different strings',
    },
  },
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
    path: 'reviewsCount',
    source: 9614,
    target: undefined,
    meta: {
      reason: 'value disappeared',
    },
  },
  {
    path: 'genres.0.name',
    source: 'classics',
    target: 'classic',
    meta: {
      reason: 'different strings',
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
    path: 'genres.1.booksCount',
    source: undefined,
    target: 843942,
    meta: {
      reason: 'value appeared',
    },
  },
  {
    path: 'genres.2',
    source: undefined,
    target: { id: 1, name: 'history' },
    meta: {
      reason: 'value appeared',
    },
  },
  {
    path: 'starsCount',
    source: undefined,
    target: 8562,
    meta: {
      reason: 'value appeared',
    },
  },
]
*/
```

## Algorithm

## Contribute

- Fork: `git clone https://github.com/mawrkus/node-package.git`
- Create your feature branch: `git checkout -b feature/my-new-feature`
- Commit your changes: `git commit -am 'Added some feature'`
- Check the build: `npm run build`
- Push to the branch: `git push origin my-new-feature`
- Submit a pull request :D
