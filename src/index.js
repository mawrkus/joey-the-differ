import flattenDeep from 'lodash.flattendeep';

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
   * @param {Array} [path=[]] current path
   * @param {Array}
   */
  diff(source, target, path = []) {
    const sourceType = JoeyTheDiffer.getType(source);

    if (sourceType.isPrimitive) {
      const results = this.comparePrimitiveTypes(source, target, path, sourceType);
      return results === null ? [] : [results];
    }

    if (sourceType.name === 'object') {
      return this.compareObjects(source, target, path);
    }

    return this.compareArrays(source, target, path);
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
   * @param {Array} path
   * @param {Object} types
   * @return {Null|Object}
   */
  comparePrimitiveTypes(source, target, path, sourceType) {
    const areEqual = this.primitiveEquality(source, target);

    if (areEqual) {
      return null;
    }

    const targetType = JoeyTheDiffer.getType(target);
    const reason = sourceType.name === targetType.name
      ? `different ${sourceType.name}s`
      : `type changed from "${sourceType.name}" to "${targetType.name}"`;

    return {
      path: path.join('.'),
      source,
      target,
      meta: {
        reason,
      },
    };
  }

  /**
   * @param {*} source
   * @param {*} target
   * @param {Array} path
   * @return {Array}
   */
  compareObjects(source, target, path) {
    const sourceResults = Object.entries(source)
      .map(([key, sourceValue]) => {
        const targetValue = target[key];
        const newPath = [...path, key];

        if (typeof targetValue === 'undefined') {
          return {
            path: newPath.join('.'),
            source: sourceValue,
            target: targetValue,
            meta: {
              reason: 'value disappeared',
            },
          };
        }

        return this.diff(sourceValue, targetValue, newPath);
      })
      .filter(Boolean);

    const targetResults = Object.entries(target)
      .map(([key, targetValue]) => {
        const sourceValue = source[key];
        const newPath = [...path, key];

        if (typeof sourceValue === 'undefined') {
          return {
            path: newPath.join('.'),
            source: sourceValue,
            target: targetValue,
            meta: {
              reason: 'value appeared',
            },
          };
        }

        return null;
      })
      .filter(Boolean);

    return flattenDeep([sourceResults, targetResults]);
  }

  /**
   * @param {*} source
   * @param {*} target
   * @param {Array} path
   * @return {Array}
   */
  compareArrays(source, target, path) {
    return [];
  }
}

export default JoeyTheDiffer;
