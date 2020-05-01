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
    const processors = blacklist.reduce((acc, regex) => ({
      ...acc,
      [regex]: { isBlackListed: true },
    }), {});

    Object.entries(preprocessors)
      .forEach(([regex, preprocessor]) => {
        processors[regex] = { ...processors[regex], preprocessor };
      });

    Object.entries(differs)
      .forEach(([regex, customDiffer]) => {
        processors[regex] = { ...processors[regex], customDiffer };
      });

    this.processors = Object.entries(processors)
      .map(([regex, { isBlackListed, preprocessor, customDiffer }]) => ({
        regex,
        isBlackListed,
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
   * @param {*} source
   * @param {*} target
   * @param {Array} [path=[]] current path
   * @return {Array}
   */
  diff(source, target, path = []) {
    const { isBlackListed, preprocessor, customDiffer } = this.findProcessors(path);

    if (isBlackListed) {
      return [];
    }

    const { source: processedSource, target: processedTarget } = preprocessor
      ? preprocessor(source, target)
      : { source, target };

    if (customDiffer) {
      return JoeyTheDiffer.customCompare(processedSource, processedTarget, path, customDiffer);
    }

    const sourceType = JoeyTheDiffer.getType(processedSource, path);
    const targetType = JoeyTheDiffer.getType(processedTarget, path);

    if (sourceType.isPrimitive || targetType.isPrimitive) {
      const change = JoeyTheDiffer.comparePrimitiveTypes(
        processedSource, processedTarget, path, sourceType, targetType,
      );

      return change === null ? [] : [change];
    }

    return this.compareObjects(processedSource, processedTarget, path);
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
          || this.findProcessors([...path, key]).isBlackListed
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
