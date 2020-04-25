const { promises: fsPromises } = require('fs');
const flattenDeep = require('lodash.flattendeep');

const { toString } = Object.prototype;

class JoeyTheDiffer {
  /**
   * @param {Object} options
   * @param {Object} [options.differs={}]
   * @param {string[]} [options.blacklist=[]]
   * @param {boolean} [options.allowNewTargetProperties=false
   */
  constructor({
    differs = {},
    blacklist = [],
    allowNewTargetProperties = false,
  } = {}) {
    this.customDiffers = Object.entries(differs)
      .map(([regex, differ]) => ({
        regex,
        differ,
      }));

    this.blacklistRegexes = blacklist;
    this.allowNewTargetProperties = allowNewTargetProperties;
  }

  /**
   * @param {string} sourcePath
   * @param {string} targetPath
   * @return {Promis.<Array>}
   */
  async diffFiles(sourcePath, targetPath) {
    const [source, target] = await Promise.all([
      fsPromises.readFile(sourcePath, { encoding: 'utf8' }).then((json) => JSON.parse(json)),
      fsPromises.readFile(targetPath, { encoding: 'utf8' }).then((json) => JSON.parse(json)),
    ]);

    return this.diff(source, target);
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

    const sourceType = JoeyTheDiffer.getType(source, path);

    if (sourceType.isPrimitive) {
      const change = JoeyTheDiffer.comparePrimitiveTypes(source, target, path, sourceType);
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
   * @param {string} path
   * @return {Object} type
   * @return {string} type.name
   * @return {boolean} type.isPrimitive
   */
  static getType(value, path) {
    const typeName = [
      'string',
      'number',
      'boolean',
      'undefined',
    ].find((name) => typeof value === name); // eslint-disable-line valid-typeof

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

    throw new TypeError(`Unknown type "${typeString}" at path "${path}"!`);
  }

  /**
   * @param {*} source
   * @param {*} target
   * @param {Array} path
   * @param {Object} types
   * @return {Null|Object}
   */
  static comparePrimitiveTypes(source, target, path, sourceType) {
    const areEqual = source === target;

    if (areEqual) {
      return null;
    }

    const targetType = JoeyTheDiffer.getType(target, path);
    const areSameType = sourceType.name === targetType.name;

    if (areSameType) {
      return {
        path: path.join('.'),
        source,
        target,
        meta: {
          op: 'update',
          reason: `different ${sourceType.name}s`,
        },
      };
    }

    return {
      path: path.join('.'),
      source,
      target,
      meta: {
        op: 'type-change',
        reason: `type changed from "${sourceType.name}" to "${targetType.name}"`,
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

    if (checkFor === 'disappearance' && typeof targetValue === 'undefined') {
      return {
        path: path.join('.'),
        source: sourceValue,
        target: targetValue,
        meta: {
          op: 'delete',
          reason: 'value disappeared',
        },
      };
    }

    if (checkFor === 'appearance' && typeof sourceValue === 'undefined') {
      return {
        path: path.join('.'),
        source: sourceValue,
        target: targetValue,
        meta: {
          op: 'add',
          reason: 'value appeared',
        },
      };
    }

    return null;
  }
}

module.exports = JoeyTheDiffer;
