import JoeyTheDiffer from '..';

describe('JoeyTheDiffer', () => {
  it('should be a class with the following API: diff()', () => {
    expect(JoeyTheDiffer).toBeInstanceOf(Function);
    expect(JoeyTheDiffer.prototype.diff).toBeInstanceOf(Function);
  });

  describe('#diff(source, target, [options])', () => {
    it('should return an array', () => {
      const joey = new JoeyTheDiffer();

      expect(joey.diff('1', '2')).toBeInstanceOf(Array);
    });

    describe('when source and target are primitive JSON values', () => {
      describe('strings diffing', () => {
        describe('the same strings', () => {
          it('should return an empty array', () => {
            const joey = new JoeyTheDiffer();

            expect(joey.diff('42', '42')).toEqual([]);
          });
        });

        describe('different strings', () => {
          it('should return the proper array of differences', () => {
            const joey = new JoeyTheDiffer();

            expect(joey.diff('41', '42')).toEqual([
              {
                path: '',
                source: '41',
                target: '42',
                meta: {
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
            const joey = new JoeyTheDiffer();

            expect(joey.diff(42, 42)).toEqual([]);
          });
        });

        describe('different numbers', () => {
          it('should return the proper array of differences', () => {
            const joey = new JoeyTheDiffer();

            expect(joey.diff(41, 42)).toEqual([
              {
                path: '',
                source: 41,
                target: 42,
                meta: {
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
            const joey = new JoeyTheDiffer();

            expect(joey.diff(true, true)).toEqual([]);
          });
        });

        describe('different booleans', () => {
          it('should return the proper array of differences', () => {
            const joey = new JoeyTheDiffer();

            expect(joey.diff(false, true)).toEqual([
              {
                path: '',
                source: false,
                target: true,
                meta: {
                  reason: 'different booleans',
                },
              },
            ]);
          });
        });
      });

      describe('nulls diffing', () => {
        it('should return an empty array', () => {
          const joey = new JoeyTheDiffer();

          expect(joey.diff(null, null)).toEqual([]);
        });
      });

      describe('different types diffing', () => {
        it('should return the proper array of differences', () => {
          const joey = new JoeyTheDiffer();

          expect(joey.diff(42, '42')).toEqual([
            {
              path: '',
              source: 42,
              target: '42',
              meta: {
                reason: 'type changed from "number" to "string"',
              },
            },
          ]);
        });
      });

      describe('unknown types diffing', () => {
        it('should throw a type error', () => {
          const joey = new JoeyTheDiffer();

          expect(() => joey.diff(Symbol('?'), '?')).toThrow(TypeError);
        });
      });
    });

    describe('when source and target are objects', () => {
      describe('for flat objects', () => {
        describe('when all their properties are equal', () => {
          it('should return an empty array', () => {
            const joey = new JoeyTheDiffer();

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

            const results = joey.diff(source, target);

            expect(results).toEqual([]);
          });
        });

        describe('when some of their properties are different', () => {
          it('should return the proper array of differences', () => {
            const joey = new JoeyTheDiffer();

            const source = {
              id: 42,
              title: 'The Prince',
              author: 'Niccolò Machiavelli',
              publishedOn: '1532',
              viewsCount: 9614,
            };

            const target = {
              id: 42,
              title: 'The Prince',
              author: 'Nicolas Machiavelli',
              publishedOn: 1532,
              starsCount: 8562,
            };

            const results = joey.diff(source, target);

            expect(results).toEqual([
              {
                path: 'author',
                source: 'Niccolò Machiavelli',
                target: 'Nicolas Machiavelli',
                meta: {
                  reason: 'different strings',
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
                path: 'viewsCount',
                source: 9614,
                target: undefined,
                meta: {
                  reason: 'value disappeared',
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
            ]);
          });
        });
      });
    });
  });
});
