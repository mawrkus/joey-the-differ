import MyClass from '..';

function createMyClass() {
  const myClass = new MyClass();

  return {
    myClass,
  };
}

describe('MyClass', () => {
  it('should be a class with the following API: doSomething()', async () => {
    expect(MyClass).toBeInstanceOf(Function);
    expect(MyClass.prototype.doSomething).toBeInstanceOf(Function);
  });

  describe('#doSomething()', () => {
    it('should return something', async () => {
      const {
        myClass,
      } = createMyClass();

      const result = myClass.doSomething();

      expect(result).toBe('something');
    });
  });
});
