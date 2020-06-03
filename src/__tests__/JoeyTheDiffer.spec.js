const JoeyTheDiffer = require('../JoeyTheDiffer');

const sortById = (a, b) => {
  if (a.id < b.id) {
    return -1;
  }
  if (a.id > b.id) {
    return +1;
  }
  return 0;
};

describe('JoeyTheDiffer({ allowNewTargetProperties, blacklist, preprocessors, differs })', () => {
  it('should be a class with the following API: diff()', () => {
    expect(JoeyTheDiffer).toBeInstanceOf(Function);
    expect(JoeyTheDiffer.prototype.diff).toBeInstanceOf(Function);
  });

  describe('#diff(source, target)', () => {
    it('should return an array', () => {
      const joeyTheDiffer = new JoeyTheDiffer();

      expect(joeyTheDiffer.diff('1', '2')).toBeInstanceOf(Array);
    });

    describe('when source and target are primitive JSON values', () => {
      describe('strings diffing', () => {
        describe('the same strings', () => {
          it('should return an empty array', () => {
            const joeyTheDiffer = new JoeyTheDiffer();

            expect(joeyTheDiffer.diff('42', '42')).toEqual([]);
          });
        });

        describe('different strings', () => {
          it('should return the proper array of differences', () => {
            const joeyTheDiffer = new JoeyTheDiffer();

            expect(joeyTheDiffer.diff('41', '42')).toEqual([
              {
                path: '',
                source: '41',
                target: '42',
                meta: {
                  op: 'replace',
                  reason: 'different strings',
                },
              },
            ]);
          });
        });
      });

      describe('numbers diffing', () => {
        describe('the same numbers', () => {
          it('should return an empty array', () => {
            const joeyTheDiffer = new JoeyTheDiffer();

            expect(joeyTheDiffer.diff(42, 42)).toEqual([]);
          });
        });

        describe('different numbers', () => {
          it('should return the proper array of differences', () => {
            const joeyTheDiffer = new JoeyTheDiffer();

            expect(joeyTheDiffer.diff(41, 42)).toEqual([
              {
                path: '',
                source: 41,
                target: 42,
                meta: {
                  op: 'replace',
                  reason: 'different numbers',
                },
              },
            ]);
          });
        });
      });

      describe('booleans diffing', () => {
        describe('the same booleans', () => {
          it('should return an empty array', () => {
            const joeyTheDiffer = new JoeyTheDiffer();

            expect(joeyTheDiffer.diff(true, true)).toEqual([]);
          });
        });

        describe('different booleans', () => {
          it('should return the proper array of differences', () => {
            const joeyTheDiffer = new JoeyTheDiffer();

            expect(joeyTheDiffer.diff(false, true)).toEqual([
              {
                path: '',
                source: false,
                target: true,
                meta: {
                  op: 'replace',
                  reason: 'different booleans',
                },
              },
            ]);
          });
        });
      });

      describe('nulls diffing', () => {
        it('should return an empty array', () => {
          const joeyTheDiffer = new JoeyTheDiffer();

          expect(joeyTheDiffer.diff(null, null)).toEqual([]);
        });
      });

      // relax: it's not JSON, but it's useful!
      describe('undefined diffing', () => {
        it('should return an empty array', () => {
          const joeyTheDiffer = new JoeyTheDiffer();

          expect(joeyTheDiffer.diff(undefined, undefined)).toEqual([]);
        });
      });

      describe('different types diffing', () => {
        it('should return the proper array of differences', () => {
          const joeyTheDiffer = new JoeyTheDiffer();

          expect(joeyTheDiffer.diff(42, '42')).toEqual([
            {
              path: '',
              source: 42,
              target: '42',
              meta: {
                op: 'replace',
                reason: 'type changed from "number" to "string"',
              },
            },
          ]);
        });

        describe('when diffing undefined to null', () => {
          it('should detect that a new value appeared', () => {
            const joeyTheDiffer = new JoeyTheDiffer();

            const diffs = joeyTheDiffer.diff(undefined, null);

            expect(diffs).toEqual([
              {
                path: '',
                source: undefined,
                target: null,
                meta: {
                  op: 'add',
                  reason: 'value appeared',
                },
              },
            ]);
          });

          describe('within objects', () => {
            it('should detect that new values appeared', () => {
              const joeyTheDiffer = new JoeyTheDiffer();

              const diffs = joeyTheDiffer.diff(
                { reviewType: undefined },
                { reviewType: { type: null }, isbn: null },
              );

              expect(diffs).toEqual([
                {
                  path: 'reviewType',
                  source: undefined,
                  target: { type: null },
                  meta: {
                    op: 'add',
                    reason: 'value appeared',
                  },
                },
                {
                  path: 'isbn',
                  source: undefined,
                  target: null,
                  meta: {
                    op: 'add',
                    reason: 'value appeared',
                  },
                },
              ]);
            });
          });
        });

        describe('when diffing null to undefined', () => {
          it('should detect that a value disappeared', () => {
            const joeyTheDiffer = new JoeyTheDiffer();

            const diffs = joeyTheDiffer.diff(null, undefined);

            expect(diffs).toEqual([
              {
                path: '',
                source: null,
                target: undefined,
                meta: {
                  op: 'remove',
                  reason: 'value disappeared',
                },
              },
            ]);
          });

          describe('within objects', () => {
            it('should detect that values disappeared', () => {
              const joeyTheDiffer = new JoeyTheDiffer();

              const diffs = joeyTheDiffer.diff(
                { reviewType: { type: null }, isbn: null },
                { reviewType: undefined },
              );

              expect(diffs).toEqual([
                {
                  path: 'reviewType',
                  source: { type: null },
                  target: undefined,
                  meta: {
                    op: 'remove',
                    reason: 'value disappeared',
                  },
                },
                {
                  path: 'isbn',
                  source: null,
                  target: undefined,
                  meta: {
                    op: 'remove',
                    reason: 'value disappeared',
                  },
                },
              ]);
            });
          });
        });
      });

      describe('unknown types diffing', () => {
        it('should throw a type error', () => {
          const joeyTheDiffer = new JoeyTheDiffer();

          expect(() => joeyTheDiffer.diff(Symbol('?'), '?')).toThrow(TypeError);
        });
      });
    });

    describe('when source and target are objects', () => {
      describe('for flat objects', () => {
        describe('when all their properties are equal', () => {
          it('should return an empty array', () => {
            const joeyTheDiffer = new JoeyTheDiffer();

            const source = {
              id: 42,
              title: 'The Prince',
              author: 'Niccolò Machiavelli',
              publishedOn: '1532',
            };

            const target = {
              id: 42,
              title: 'The Prince',
              author: 'Niccolò Machiavelli',
              publishedOn: '1532',
            };

            const changes = joeyTheDiffer.diff(source, target);

            expect(changes).toEqual([]);
          });
        });

        describe('when some of their properties are different', () => {
          it('should return the proper array of differences', () => {
            const joeyTheDiffer = new JoeyTheDiffer();

            const source = {
              id: 42,
              title: 'The Prince',
              author: 'Niccolò Machiavelli',
              publishedOn: '1532',
              reviewsCount: 9614,
              isbn: undefined,
            };

            const target = {
              id: 42,
              title: 'The Prince',
              author: 'Nicolas Machiavelli',
              publishedOn: 1532,
              starsCount: 8562,
            };

            const changes = joeyTheDiffer.diff(source, target);

            expect(changes).toEqual([
              {
                path: 'author',
                source: 'Niccolò Machiavelli',
                target: 'Nicolas Machiavelli',
                meta: {
                  op: 'replace',
                  reason: 'different strings',
                },
              },
              {
                path: 'publishedOn',
                source: '1532',
                target: 1532,
                meta: {
                  op: 'replace',
                  reason: 'type changed from "string" to "number"',
                },
              },
              {
                path: 'reviewsCount',
                source: 9614,
                target: undefined,
                meta: {
                  op: 'remove',
                  reason: 'value disappeared',
                },
              },
              {
                path: 'starsCount',
                source: undefined,
                target: 8562,
                meta: {
                  op: 'add',
                  reason: 'value appeared',
                },
              },
            ]);
          });
        });
      });

      describe('for deep objects', () => {
        describe('when all their properties are equal', () => {
          it('should return an empty array', () => {
            const joeyTheDiffer = new JoeyTheDiffer();

            const source = {
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
            };

            const target = {
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
            };

            const changes = joeyTheDiffer.diff(source, target);

            expect(changes).toEqual([]);
          });
        });

        describe('when some of their properties are different', () => {
          it('should return the proper array of differences', () => {
            const joeyTheDiffer = new JoeyTheDiffer();

            const source = {
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
            };

            const target = {
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
            };

            const changes = joeyTheDiffer.diff(source, target);

            expect(changes).toEqual([
              {
                path: 'author.name',
                source: 'Niccolò',
                target: 'Nicolas',
                meta: {
                  op: 'replace',
                  reason: 'different strings',
                },
              },
              {
                path: 'author.life.bornOn',
                source: '3 May 1469',
                target: undefined,
                meta: {
                  op: 'remove',
                  reason: 'value disappeared',
                },
              },
              {
                path: 'author.life.diedOn',
                source: '21 June 1527',
                target: '21 June 1532',
                meta: {
                  op: 'replace',
                  reason: 'different strings',
                },
              },
              {
                path: 'author.life.bornIn',
                source: undefined,
                target: 'Firenze',
                meta: {
                  op: 'add',
                  reason: 'value appeared',
                },
              },
              {
                path: 'publishedOn',
                source: '1532',
                target: 1532,
                meta: {
                  op: 'replace',
                  reason: 'type changed from "string" to "number"',
                },
              },
              {
                path: 'reviewsCount',
                source: 9614,
                target: undefined,
                meta: {
                  op: 'remove',
                  reason: 'value disappeared',
                },
              },
              {
                path: 'starsCount',
                source: undefined,
                target: 8562,
                meta: {
                  op: 'add',
                  reason: 'value appeared',
                },
              },
            ]);
          });
        });
      });
    });

    describe('when source and target are arrays', () => {
      describe('for flat arrays', () => {
        describe('when all their elements are equal', () => {
          it('should return an empty array', () => {
            const joeyTheDiffer = new JoeyTheDiffer();

            const source = ['classics', 'philosophy'];

            const target = ['classics', 'philosophy'];

            const changes = joeyTheDiffer.diff(source, target);

            expect(changes).toEqual([]);
          });
        });

        describe('when some of their elements are different', () => {
          it('should return the proper array of differences', () => {
            const joeyTheDiffer = new JoeyTheDiffer();

            const source = ['classics', 'philosophy'];

            const target = ['classic', 'philosophy', 'history', 'politics'];

            const changes = joeyTheDiffer.diff(source, target);

            expect(changes).toEqual([
              {
                path: '0',
                source: 'classics',
                target: 'classic',
                meta: {
                  op: 'replace',
                  reason: 'different strings',
                },
              },
              {
                path: '2',
                source: undefined,
                target: 'history',
                meta: {
                  op: 'add',
                  reason: 'value appeared',
                },
              },
              {
                path: '3',
                source: undefined,
                target: 'politics',
                meta: {
                  op: 'add',
                  reason: 'value appeared',
                },
              },
            ]);
          });
        });
      });

      describe('for deep arrays', () => {
        describe('when all their elements are equal', () => {
          it('should return an empty array', () => {
            const joeyTheDiffer = new JoeyTheDiffer();

            const source = [
              [7, 'classics'],
              [93, 'philosophy', ['so', true]],
            ];

            const target = [
              [7, 'classics'],
              [93, 'philosophy', ['so', true]],
            ];

            const changes = joeyTheDiffer.diff(source, target);

            expect(changes).toEqual([]);
          });
        });

        describe('when some of their elements are different', () => {
          it('should return the proper array of differences', () => {
            const joeyTheDiffer = new JoeyTheDiffer();

            const source = [
              [7, 'classics'],
              [93, 'philosophy', ['so', true]],
            ];

            const target = [
              [7, 'classic'],
              [93],
              [4, 'history'],
              [null, null],
            ];

            const changes = joeyTheDiffer.diff(source, target);

            expect(changes).toEqual([
              {
                path: '0.1',
                source: 'classics',
                target: 'classic',
                meta: {
                  op: 'replace',
                  reason: 'different strings',
                },
              },
              {
                path: '1.1',
                source: 'philosophy',
                target: undefined,
                meta: {
                  op: 'remove',
                  reason: 'value disappeared',
                },
              },
              {
                path: '1.2',
                source: ['so', true],
                target: undefined,
                meta: {
                  op: 'remove',
                  reason: 'value disappeared',
                },
              },
              {
                path: '2',
                source: undefined,
                target: [4, 'history'],
                meta: {
                  op: 'add',
                  reason: 'value appeared',
                },
              },
              {
                path: '3',
                source: undefined,
                target: [null, null],
                meta: {
                  op: 'add',
                  reason: 'value appeared',
                },
              },
            ]);
          });
        });
      });
    });

    describe('when mixing objects and arrays', () => {
      describe('when all their properties are equal', () => {
        it('should return an empty array', () => {
          const joeyTheDiffer = new JoeyTheDiffer();

          const source = {
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

          const target = {
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

          const changes = joeyTheDiffer.diff(source, target);

          expect(changes).toEqual([]);
        });
      });

      describe('when some of their properties are different', () => {
        it('should return the proper array of differences', () => {
          const joeyTheDiffer = new JoeyTheDiffer();

          const source = {
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

          const target = {
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

          const changes = joeyTheDiffer.diff(source, target);

          expect(changes).toEqual([
            {
              path: 'author.name',
              source: 'Niccolò',
              target: 'Nicolas',
              meta: {
                op: 'replace',
                reason: 'different strings',
              },
            },
            {
              path: 'author.life.bornOn',
              source: '3 May 1469',
              target: undefined,
              meta: {
                op: 'remove',
                reason: 'value disappeared',
              },
            },
            {
              path: 'author.life.diedOn',
              source: '21 June 1527',
              target: '21 June 1532',
              meta: {
                op: 'replace',
                reason: 'different strings',
              },
            },
            {
              path: 'author.life.bornIn',
              source: undefined,
              target: 'Firenze',
              meta: {
                op: 'add',
                reason: 'value appeared',
              },
            },
            {
              path: 'publishedOn',
              source: '1532',
              target: 1532,
              meta: {
                op: 'replace',
                reason: 'type changed from "string" to "number"',
              },
            },
            {
              path: 'reviewsCount',
              source: 9614,
              target: undefined,
              meta: {
                op: 'remove',
                reason: 'value disappeared',
              },
            },
            {
              path: 'genres.0.name',
              source: 'classics',
              target: 'classic',
              meta: {
                op: 'replace',
                reason: 'different strings',
              },
            },
            {
              path: 'genres.1.id',
              source: 93,
              target: undefined,
              meta: {
                op: 'remove',
                reason: 'value disappeared',
              },
            },
            {
              path: 'genres.1.booksCount',
              source: undefined,
              target: 843942,
              meta: {
                op: 'add',
                reason: 'value appeared',
              },
            },
            {
              path: 'genres.2',
              source: undefined,
              target: { id: 1, name: 'history' },
              meta: {
                op: 'add',
                reason: 'value appeared',
              },
            },
            {
              path: 'starsCount',
              source: undefined,
              target: 8562,
              meta: {
                op: 'add',
                reason: 'value appeared',
              },
            },
          ]);
        });
      });
    });

    describe('when passing custom differs as option', () => {
      it('should use them properly for diffing', () => {
        const joeyTheDiffer = new JoeyTheDiffer({
          differs: {
            'publishedOn': (source, target) => ({
              areEqual: source == target, // eslint-disable-line eqeqeq
              meta: {
                op: 'replace',
                reason: 'different publish year after loose comparison',
              },
            }),
            'reviewsCount': (source, target) => ({
              areEqual: source <= target,
              meta: {
                op: 'replace',
                reason: 'number of reviews decreased',
                delta: target - source,
              },
            }),
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
            'isbn': (source, target) => ({
              areEqual: !source === !target,
              meta: {
                op: 'replace',
                reason: 'different falsy values',
              },
            }),
          },
        });

        const source = {
          id: 42,
          title: 'The Prince',
          author: {
            name: 'Niccolò',
            surname: 'Machiavelli',
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
          isbn: null,
        };

        const target = {
          id: 42,
          title: 'The Prince',
          author: {
            name: 'Niccolò',
            surname: 'Machiavelli',
          },
          publishedOn: 1532,
          reviewsCount: 10000,
          starsCount: 1,
          genres: [{
            id: 4,
            name: 'CLASSICS',
          }, {
            id: 93,
            name: 'PHILOSOPHY',
          }],
        };

        const changes = joeyTheDiffer.diff(source, target);

        expect(changes).toEqual([
          {
            path: 'starsCount',
            source: 8562,
            target: 1,
            meta: {
              op: 'replace',
              reason: 'number of stars decreased',
              delta: -8561,
            },
          },
        ]);
      });
    });

    describe('when passing a blacklist as option', () => {
      it('should not diff the corresponding values ', () => {
        const joeyTheDiffer = new JoeyTheDiffer({
          blacklist: [
            'publishedOn',
            'reviewsCount',
            'starsCount',
            'genres\\.(\\d+)\\.booksCount',
          ],
        });

        const source = {
          id: 42,
          title: 'The Prince',
          author: {
            name: 'Niccolò',
            surname: 'Machiavelli',
          },
          publishedOn: '1532',
          reviewsCount: 9614,
          starsCount: 8562,
          genres: [{
            id: 4,
            name: 'classics',
            booksCount: 191811,
          }, {
            id: 93,
            name: 'philosophy',
          }],
        };

        const target = {
          id: 42,
          title: 'The Prince',
          author: {
            name: 'Niccolò',
            surname: 'Machiavelli',
          },
          publishedOn: 1532,
          reviewsCount: 10000,
          starsCount: 1,
          genres: [{
            id: 4,
            name: 'classics',
            booksCount: 191811,
          }, {
            id: 93,
            name: 'philosophy',
            booksCount: 843942,
          }],
        };

        const changes = joeyTheDiffer.diff(source, target);

        expect(changes).toEqual([]);
      });
    });

    describe('when passing preprocessors as option', () => {
      describe('when preprocessing primitive values', () => {
        it('should properly preprocess the corresponding values before diffing', () => {
          const joeyTheDiffer = new JoeyTheDiffer({
            preprocessors: {
              '': (source, target) => ({
                source: String(source),
                target: String(target),
              }),
            },
          });

          expect(joeyTheDiffer.diff(42, '42')).toEqual([]);

          expect(joeyTheDiffer.diff(null, undefined)).toEqual([{
            path: '',
            source: null,
            target: undefined,
            meta: {
              op: 'replace',
              reason: 'different strings',
              preprocessor: {
                source: 'null',
                target: 'undefined',
              },
            },
          }]);
        });
      });

      describe('when diffing objects', () => {
        it('should properly preprocess the corresponding values before diffing', () => {
          const joeyTheDiffer = new JoeyTheDiffer({
            preprocessors: {
              'publishedOn': (source, target) => ({
                source: String(source),
                target: String(target),
              }),
              'genres$': (source, target) => ({
                source: source.sort(sortById),
                target: target.sort(sortById),
              }),
              'genres\\.(\\d+)\\.name': (source, target) => ({
                source: source.toLowerCase(),
                target: target.toLowerCase(),
              }),
              'relatedBookIds': (source, target) => ({
                source: source || [],
                target: target || [],
              }),
            },
          });

          const source = {
            id: 42,
            title: 'The Prince',
            publishedOn: '1532',
            genres: [{
              id: 4,
              name: 'classics',
            }, {
              id: 93,
              name: 'philosophy',
            }],
            relatedBookIds: null,
          };

          const target = {
            id: 42,
            title: 'The Prince',
            publishedOn: 1532,
            genres: [{
              id: 93,
              name: 'PHILOSOPHY',
            }, {
              id: 4,
              name: 'CLASSIC',
            }],
            relatedBookIds: [],
          };

          const changes = joeyTheDiffer.diff(source, target);

          expect(changes).toEqual([
            {
              path: 'genres.0.name',
              source: 'classics',
              target: 'CLASSIC',
              meta: {
                op: 'replace',
                reason: 'different strings',
                preprocessor: {
                  source: 'classics',
                  target: 'classic',
                },
              },
            },
          ]);
        });
      });
    });

    describe('when mixing objects, arrays, preprocessors, custom differs and blacklist', () => {
      it('should return the proper array of differences', () => {
        const options = {
          blacklist: [
            'reviewsCount',
            'genres\\.(\\d+)\\.booksCount',
          ],
          preprocessors: {
            starsCount: (source, target) => ({
              source: Number(source || 0),
              target: Number(target || 0),
            }),
            genres$: (source, target) => ({
              source: source.sort(sortById),
              target: target.sort(sortById),
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

        const joeyTheDiffer = new JoeyTheDiffer(options);

        const source = {
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
          starsCount: '8562',
          genres: [{
            id: 93,
            name: 'philosophy',
          }, {
            id: 4,
            name: 'classics',
          }],
        };

        const target = {
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

        const changes = joeyTheDiffer.diff(source, target);

        expect(changes).toEqual([
          {
            path: 'author.life.bornOn',
            source: '3 May 1469',
            target: undefined,
            meta: {
              op: 'remove',
              reason: 'value disappeared',
            },
          },
          {
            path: 'author.life.diedOn',
            source: '21 June 1527',
            target: '21 June 1532',
            meta: {
              op: 'replace',
              reason: 'different strings',
            },
          },
          {
            path: 'author.life.bornIn',
            source: undefined,
            target: 'Firenze',
            meta: {
              op: 'add',
              reason: 'value appeared',
            },
          },
          {
            path: 'publishedOn',
            source: '1532',
            target: 1532,
            meta: {
              op: 'replace',
              reason: 'type changed from "string" to "number"',
            },
          },
          {
            path: 'starsCount',
            source: '8562',
            target: null,
            meta: {
              op: 'replace',
              reason: 'number of stars decreased',
              delta: -8562,
              preprocessor: {
                source: 8562,
                target: 0,
              },
            },
          },
          {
            path: 'genres.0.name',
            source: 'classics',
            target: 'CLASSIC',
            meta: {
              op: 'replace',
              reason: 'different genre names in lower case',
            },
          },
          {
            path: 'genres.1.id',
            source: 93,
            target: undefined,
            meta: {
              op: 'remove',
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
              op: 'add',
              reason: 'value appeared',
            },
          },
        ]);
      });
    });

    describe('when allowing new properties on target object', () => {
      it('should return the proper array of differences', () => {
        const options = {
          allowNewTargetProperties: true,
          blacklist: [
            'reviewsCount',
            'genres\\.(\\d+)\\.booksCount',
          ],
          differs: {
            'publishedOn': (source, target) => ({
              areEqual: source == target, // eslint-disable-line eqeqeq
              meta: {
                op: 'replace',
                reason: 'different publish years after loose comparison',
              },
            }),
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

        const joeyTheDiffer = new JoeyTheDiffer(options);

        const source = {
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

        const target = {
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

        const changes = joeyTheDiffer.diff(source, target);

        expect(changes).toEqual([
          {
            path: 'author.life.bornOn',
            source: '3 May 1469',
            meta: {
              op: 'remove',
              reason: 'value disappeared',
            },
          },
          {
            path: 'author.life.diedOn',
            source: '21 June 1527',
            target: '21 June 1532',
            meta: {
              op: 'replace',
              reason: 'different strings',
            },
          },
          {
            path: 'starsCount',
            source: 8562,
            target: 1,
            meta: {
              op: 'replace',
              reason: 'number of stars decreased',
              delta: -8561,
            },
          },
          {
            path: 'genres.0.name',
            source: 'classics',
            target: 'CLASSIC',
            meta: {
              op: 'replace',
              reason: 'different genre names in lower case',
            },
          },
          {
            path: 'genres.1.id',
            source: 93,
            meta: {
              op: 'remove',
              reason: 'value disappeared',
            },
          },
        ]);
      });
    });

    describe('when returning path as an array', () => {
      it('should return the proper array of differences', () => {
        const joeyTheDiffer = new JoeyTheDiffer({
          returnPathAsAnArray: true,
        });

        const source = {
          'id': 42,
          'book.title': 'The Prince',
          'book': {
            title: 'The Prince',
          },
        };

        const target = {
          id: 42,
          book: {
          },
        };

        const changes = joeyTheDiffer.diff(source, target);

        expect(changes).toEqual([
          {
            path: ['book.title'],
            source: 'The Prince',
            target: undefined,
            meta: {
              op: 'remove',
              reason: 'value disappeared',
            },
          },
          {
            path: ['book', 'title'],
            source: 'The Prince',
            target: undefined,
            meta: {
              op: 'remove',
              reason: 'value disappeared',
            },
          },
        ]);
      });
    });
  });
});
