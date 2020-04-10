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
  });
});
