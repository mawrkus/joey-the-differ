const { toString } = Object.prototype;

class JoeyTheDiffer {
  /**
   * @param {Object} options
   * @param {Object} [options.primitiveEquality=(s, t) => s === t]
   */
  constructor({
    primitiveEquality = (source, target) => source === target,
  } = {}) {
    this.primitiveEquality = primitiveEquality;
  }

  /**
   * @param {*} source
   * @param {*} target
   * @param {string} [path=''] current path
   */
  diff(source, target, path = '') {
    const sourceType = JoeyTheDiffer.getType(source);

    if (sourceType.isPrimitive) {
      return this.comparePrimitiveTypes(source, target, path, sourceType);
    }

    return this.compareObjectTypes(source, target, path);
  }

  /**
   * @param {*} value
   * @return {Object} type
   * @return {string} type.name
   * @return {boolean} type.isPrimitive
   */
  static getType(value) {
    const typeName = ['string', 'number', 'boolean'].find((name) => typeof value === name);
    if (typeName) {
      return {
        name: typeName,
        isPrimitive: true,
      };
    }

    if (value === null) {
      return {
        name: 'null',
        isPrimitive: true,
      };
    }

    const typeString = toString.call(value);

    if (typeString === '[object Object]') {
      return {
        name: 'object',
        isPrimitive: false,
      };
    }

    if (typeString === '[object Array]') {
      return {
        name: 'array',
        isPrimitive: false,
      };
    }

    throw new TypeError(`Unknown type "${typeString}"!`);
  }

  /**
   * @param {*} source
   * @param {*} target
   * @param {string} path
   * @param {Object} types
   * @return {Array}
   */
  comparePrimitiveTypes(source, target, path, sourceType) {
    const areEqual = this.primitiveEquality(source, target);

    if (areEqual) {
      return [];
    }

    const targetType = JoeyTheDiffer.getType(target);
    const reason = sourceType.name === targetType.name
      ? `different ${sourceType.name}s`
      : `type changed from "${sourceType.name}" to "${targetType.name}"`;

    return [{
      path,
      source,
      target,
      meta: {
        reason,
      },
    }];
  }

  /**
   * @param {*} source
   * @param {*} target
   * @param {string} path
   * @return {Array}
   */
  compareObjectTypes(source, target, path) {
    return [];
  }
}

export default JoeyTheDiffer;
