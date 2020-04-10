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
  differs: {
    'publishedOn': (source, target) => ({
      areEqual: source == target, // eslint-disable-line eqeqeq
      meta: {
        reason: 'different publish years after loose comparison',
      },
    }),
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

const results = joey.diff(currentBookData, newBookData);

console.log(results);

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

## Contribute

- Fork: `git clone https://github.com/mawrkus/node-package.git`
- Create your feature branch: `git checkout -b feature/my-new-feature`
- Commit your changes: `git commit -am 'Added some feature'`
- Check the test: `npm run test`
- Push to the branch: `git push origin my-new-feature`
- Submit a pull request :D
