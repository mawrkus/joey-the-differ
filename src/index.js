import flattenDeep from 'lodash.flattendeep';

const { toString } = Object.prototype;

class JoeyTheDiffer {
  /**
   * @param {Object} options
   * @param {Object} [options.primitiveEquality=(s, t) => s === t]
   * @param {Object} [options.differs={}]
   * @param {string[]} [options.blacklist=[]]
   * @param {boolean} [options.allowNewTargetProperties=false
   */
  constructor({
    primitiveEquality = (source, target) => source === target,
    differs = {},
    blacklist = [],
    allowNewTargetProperties = false,
  } = {}) {
    this.primitiveEquality = primitiveEquality;

    this.customDiffers = Object.entries(differs)
      .map(([regex, differ]) => ({
        regex,
        differ,
      }));

    this.blacklistRegexes = blacklist;
    this.allowNewTargetProperties = allowNewTargetProperties;
  }

  /**
   * @param {*} source
   * @param {*} target
   * @param {Array} [path=[]] current path
   * @return {Array}
   */
  diff(source, target, path = []) {
    if (this.isBlacklisted(path)) {
      return [];
    }

    const customDiffer = this.findCustomDiffer(path);

    if (customDiffer) {
      return JoeyTheDiffer.customCompare(source, target, path, customDiffer);
    }

    const sourceType = JoeyTheDiffer.getType(source);

    if (sourceType.isPrimitive) {
      const change = this.comparePrimitiveTypes(source, target, path, sourceType);
      return change === null ? [] : [change];
    }

    return this.compareObjects(source, target, path);
  }

  /**
   * @param {Array} path
   * @return {boolean}
   */
  isBlacklisted(path) {
    const pathAsString = path.join('.');
    const found = this.blacklistRegexes.find((regex) => (new RegExp(regex)).test(pathAsString));
    return Boolean(found);
  }

  /**
   * @param {Array} path
   * @return {Function|Null}
   */
  findCustomDiffer(path) {
    const pathAsString = path.join('.');
    const found = this.customDiffers.find(({ regex }) => (new RegExp(regex)).test(pathAsString));

    return found
      ? found.differ
      : null;
  }

  /**
   * @param {*} source
   * @param {*} target
   * @param {Array} path
   * @param {Function} customDiffer
   * @return {Array}
   */
  static customCompare(source, target, path, customDiffer) {
    const { areEqual, meta } = customDiffer(source, target, path);

    return areEqual
      ? []
      : [{
        path: path.join('.'),
        source,
        target,
        meta,
      }];
  }

  /**
   * @param {*} value
   * @return {Object} type
   * @return {string} type.name
   * @return {boolean} type.isPrimitive
   */
  static getType(value) {
    // eslint-disable-next-line valid-typeof
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
    const sourceChanges = Object.entries(source)
      .map(([key, sourceValue]) => {
        const targetValue = target[key];
        const newPath = [...path, key];
        const change = this.comparePropertyExistence(sourceValue, targetValue, newPath, 'disappearance');

        if (change) {
          return change;
        }

        return this.diff(sourceValue, targetValue, newPath);
      })
      .filter(Boolean);

    if (this.allowNewTargetProperties) {
      return flattenDeep(sourceChanges);
    }

    const targetChanges = Object.entries(target)
      .map(([key, targetValue]) => {
        const sourceValue = source[key];
        const newPath = [...path, key];

        return this.comparePropertyExistence(sourceValue, targetValue, newPath, 'appearance');
      })
      .filter(Boolean);

    return flattenDeep([sourceChanges, targetChanges]);
  }

  /**
   * @param {*} sourceValue
   * @param {*} targetValue
   * @param {Array} path
   * @param {string} checkFor 'appearance' or 'disappearance'
   * @return {Null|Object}
   */
  comparePropertyExistence(sourceValue, targetValue, path, checkFor) {
    if (this.isBlacklisted(path)) {
      return null;
    }

    if (checkFor === 'appearance' && typeof sourceValue === 'undefined') {
      return {
        path: path.join('.'),
        source: sourceValue,
        target: targetValue,
        meta: {
          reason: 'value appeared',
        },
      };
    }

    if (checkFor === 'disappearance' && typeof targetValue === 'undefined') {
      return {
        path: path.join('.'),
        source: sourceValue,
        target: targetValue,
        meta: {
          reason: 'value disappeared',
        },
      };
    }

    return null;
  }
}

export default JoeyTheDiffer;
