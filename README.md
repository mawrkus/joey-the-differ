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
  },
  publishedOn: '1532',
  viewsCount: 9614,
  starsCount: 8562,
  genres: ['classics', 'philosophy'],
  merchants: [{
    id: 93,
    name: 'Lola\'s Books',
    certified: false,
  }, {
    id: 144,
    name: 'Pedro\'s Corner',
    certified: true,
  }],
  reviewsCount: 7733,
};

const newBookData = {
  id: 42,
  title: 'The Prince',
  author: {
    name: 'Nicolas',
    surname: 'machiavelli',
  },
  publishedOn: 1532,
  viewsCount: 8500,
  genres: ['history', 'politics', 'classic', 'philosophy'],
  merchants: [{
    id: 93,
    name: 'Lola\'s Books',
    certified: true,
  }, {
    id: 144,
    name: 'Pedro\'s Cornershop',
    location: 'Portofino',
    certified: 1,
  }],
  reviewsCount: 9999,
};

const options = {
  okIfValuesAppear: false,
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
    path: 'publishedOn',
    source: '1532',
    target: 1532,
    meta: {
      reason: 'different types',
    },
  },
  {
    path: 'viewsCount',
    source: 9614,
    target: 8500,
    meta: {
      reason: 'value decreased',
      diff: -1114,
    },
  },
  {
    path: 'starsCount',
    source: 8562,
    target: undefined,
    meta: {
      reason: 'value disappeared',
    },
  },
  {
    path: 'genres',
    source: ['classics', 'philosophy'],
    target: ['history', 'politics', 'classic', 'philosophy'],
    meta: {
      reason: 'different array elements',
      removed: ['classics'],
      added: ['history', 'politics', 'classic'],
    },
  },
  {
    path: 'merchants',
    source: [{
      id: 93,
      name: 'Lola\'s Books',
      certified: false,
    }, {
      id: 144,
      name: 'Pedro\'s Corner',
      certified: true,
    }],
    target: [{
      id: 93,
      name: 'Lola\'s Books',
      certified: true,
    }, {
      id: 144,
      name: 'Pedro\'s Cornershop',
      location: 'Portofino',
      certified: 1,
    }],
    meta: {
      reason: 'array elements differs',
      diffs: [{
        path: '0.certified',
        source: false,
        target: true,
        meta: {
          reason: 'different values after loose comparison',
        },
      }, {
        path: '1.name',
        source: 'Pedro\'s Corner',
        target: 'Pedro\'s Cornershop',
        meta: {
          reason: 'different strings',
        },
      }, {
        path: '1.location',
        source: undefined,
        target: 'Portofino',
        meta: {
          reason: 'value appeared',
        },
      }],
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
