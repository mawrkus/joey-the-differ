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
      return JoeyTheDiffer.customCompare(
        { value: source, processedValue: processedSource },
        { value: target, processedValue: processedTarget },
        path,
        customDiffer,
        Boolean(preprocessor),
      );
    }

    const sourceType = JoeyTheDiffer.getType(processedSource, path);
    const targetType = JoeyTheDiffer.getType(processedTarget, path);

    if (sourceType.isPrimitive || targetType.isPrimitive) {
      const change = JoeyTheDiffer.comparePrimitiveTypes(
        { value: source, processedValue: processedSource, type: sourceType },
        { value: target, processedValue: processedTarget, type: targetType },
        path,
        Boolean(preprocessor),
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
   * @param {Object} source
   * @param {Object} target
   * @param {Array} path
   * @param {Function} customDiffer
   * @param {boolean} wasProcessed
   * @return {Array}
   */
  static customCompare(source, target, path, customDiffer, wasProcessed) {
    const { areEqual, meta } = customDiffer(source.processedValue, target.processedValue, path);

    if (wasProcessed) {
      meta.preprocessor = {
        source: source.processedValue,
        target: target.processedValue,
      };
    }

    return areEqual
      ? []
      : [{
        path: path.join('.'),
        source: source.value,
        target: target.value,
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
   * @param {Object} source
   * @param {Object} target
   * @param {Array} path
   * @param {boolean} wasProcessed
   * @return {Null|Object}
   */
  static comparePrimitiveTypes(source, target, path, wasProcessed) {
    const areEqual = source.processedValue === target.processedValue;

    if (areEqual) {
      return null;
    }

    const partialResult = {
      path: path.join('.'),
      source: source.value,
      target: target.value,
    };

    let op;
    let reason;

    if (source.type.name === target.type.name) {
      op = 'replace';
      reason = `different ${source.type.name}s`;
    } else if (!this.allowNewTargetProperties && source.type.name === 'undefined') {
      op = 'add';
      reason = 'value appeared';
    } else if (target.type.name === 'undefined') {
      op = 'remove';
      reason = 'value disappeared';
    } else {
      op = 'replace';
      reason = `type changed from "${source.type.name}" to "${target.type.name}"`;
    }

    return {
      ...partialResult,
      meta: wasProcessed
        ? {
          op,
          reason,
          preprocessor: {
            source: source.processedValue,
            target: target.processedValue,
          },
        }
        : {
          op,
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
