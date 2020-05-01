const { promises: fsPromises } = require('fs');
const flattenDeep = require('lodash.flattendeep');

const { toString } = Object.prototype;

class JoeyTheDiffer {
  /**
   * @param {Object} options
   * @param {Object} [options.preprocessors={}]
   * @param {Object} [options.differs={}]
   * @param {string[]} [options.blacklist=[]]
   * @param {boolean} [options.allowNewTargetProperties=false
   */
  constructor({
    differs = {},
    preprocessors = {},
    blacklist = [],
    allowNewTargetProperties = false,
  } = {}) {
    const processors = {};

    Object.entries(preprocessors)
      .forEach(([regex, preprocessor]) => {
        processors[regex] = { preprocessor };
      });

    Object.entries(differs)
      .forEach(([regex, customDiffer]) => {
        processors[regex] = { ...processors[regex], customDiffer };
      });

    this.processors = Object.entries(processors)
      .map(([regex, { preprocessor, customDiffer }]) => ({
        regex,
        preprocessor,
        customDiffer,
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
   * @param {*} rawSource
   * @param {*} rawTarget
   * @param {Array} [path=[]] current path
   * @return {Array}
   */
  diff(rawSource, rawTarget, path = []) {
    if (this.isBlacklisted(path)) {
      return [];
    }

    const { preprocessor, customDiffer } = this.findProcessors(path);

    const { source, target } = preprocessor
      ? preprocessor(rawSource, rawTarget)
      : { source: rawSource, target: rawTarget };

    if (customDiffer) {
      return JoeyTheDiffer.customCompare(source, target, path, customDiffer);
    }

    const sourceType = JoeyTheDiffer.getType(source, path);
    const targetType = JoeyTheDiffer.getType(target, path);

    if (sourceType.isPrimitive || targetType.isPrimitive) {
      const change = JoeyTheDiffer.comparePrimitiveTypes(
        source, target, path, sourceType, targetType,
      );

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
   * @return {Object|Null}
   */
  findProcessors(path) {
    const pathAsString = path.join('.');
    const found = this.processors.find(({ regex }) => (new RegExp(regex)).test(pathAsString));
    return found || {};
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
   * @param {Object} sourceType
   * @param {Object} targetType
   * @return {Null|Object}
   */
  static comparePrimitiveTypes(source, target, path, sourceType, targetType) {
    const areEqual = source === target;

    if (areEqual) {
      return null;
    }

    const partialResult = {
      path: path.join('.'),
      source,
      target,
    };

    if (sourceType.name === targetType.name) {
      return {
        ...partialResult,
        meta: {
          op: 'replace',
          reason: `different ${sourceType.name}s`,
        },
      };
    }

    if (!this.allowNewTargetProperties && sourceType.name === 'undefined') {
      return {
        ...partialResult,
        meta: {
          op: 'add',
          reason: 'value appeared',
        },
      };
    }

    if (targetType.name === 'undefined') {
      return {
        ...partialResult,
        meta: {
          op: 'remove',
          reason: 'value disappeared',
        },
      };
    }

    return {
      ...partialResult,
      meta: {
        op: 'replace',
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
      .map(([key, sourceValue]) => this.diff(sourceValue, target[key], [...path, key]));

    if (this.allowNewTargetProperties) {
      return flattenDeep(sourceChanges);
    }

    const targetChanges = Object.entries(target)
      .map(([key, targetValue]) => {
        if (
          (key in source)
          || (typeof targetValue === 'undefined')
          || this.isBlacklisted([...path, key])
        ) {
          return [];
        }

        return {
          path: [...path, key].join('.'),
          source: source[key],
          target: targetValue,
          meta: {
            op: 'add',
            reason: 'value appeared',
          },
        };
      });

    return flattenDeep([sourceChanges, targetChanges]);
  }
}

module.exports = JoeyTheDiffer;
