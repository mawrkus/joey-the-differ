module.exports = {
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
