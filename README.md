# 🧬 Joey the Differ

JSON diffing on steroids.

## Installation

```shell
npm install joey-the-differ
```

## Usage

```js
import JoeyTheDiffer from 'joey-the-differ';

const joey = new JoeyTheDiffer();

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
    id: 4,
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
  genres: ['history', 'politics', 'classics', 'philosophy'],
  merchants: [{
    id: 4,
    name: 'Pedro\'s Cornershop',
    location: 'Portofino',
    certified: 1,
  }],
  reviewsCount: 9999,
};

const options = {
  strictTypes: true,
  blacklist: ['reviewsCount', 'merchants.name'],
  diffs: {
    'author.surname': (source, target) => source.toLowercase() === target.toLowercase(),
    'viewsCount': (source, target) => source <= target,
    'merchants.certified': (source, target) => source == target,
  },
};

const result = joey.diff(currentBookData, newBookData, options);
console.log(result);

/*
[
  {
    path: 'author.name',
    source: 'Niccolò',
    target: 'Nicolas',
    meta: {
      reason: 'different strings',
    },
  }
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
