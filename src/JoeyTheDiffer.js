const flattenDeep = require('lodash.flattendeep');

const { toString } = Object.prototype;

class JoeyTheDiffer {
  /**
   * @param {Object} options
   * @param {Object} [options.preprocessors={}]
   * @param {Object} [options.differs={}]
   * @param {string[]} [options.blacklist=[]]
   * @param {boolean} [options.allowNewTargetProperties=false]
   * @param {boolean} [options.returnPathAsAnArray=false]
   */
  constructor({
    preprocessors = {},
    differs = {},
    blacklist = [],
    allowNewTargetProperties = false,
    returnPathAsAnArray = false,
    extendedTypesDiffer = null,
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

    this.allowNewTargetProperties = allowNewTargetProperties;
    this.returnPathAsAnArray = returnPathAsAnArray;
    this.extendedTypesDiffer = extendedTypesDiffer;
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

    const sourceObj = { value: source, processedValue: processedSource };
    const targetObj = { value: target, processedValue: processedTarget };
    const wasPreprocessed = Boolean(preprocessor);

    if (customDiffer) {
      return this.customCompare(
        customDiffer,
        sourceObj,
        targetObj,
        path,
        wasPreprocessed,
      );
    }

    return this.compare(
      sourceObj,
      targetObj,
      path,
      wasPreprocessed,
    );
  }

  /**
   * @param {Function} customDiffer
   * @param {Object} source
   * @param {Object} target
   * @param {Array} path
   * @param {Boolean} wasPreprocessed
   * @return {Array} change
   */
  customCompare(customDiffer, source, target, path, wasPreprocessed) {
    const { areEqual, meta } = customDiffer(
      source.processedValue,
      target.processedValue,
      path,
    );

    if (wasPreprocessed) {
      meta.preprocessor = {
        source: source.processedValue,
        target: target.processedValue,
      };
    }

    return areEqual
      ? []
      : [{
        path: this.returnPathAsAnArray ? path : path.join('.'),
        source: source.value,
        target: target.value,
        meta,
      }];
  }

  /**
   * @param {Object} source
   * @param {Object} target
   * @param {Array} path
   * @param {Boolean} wasPreprocessed
   * @return {Array} change
   */
  compare(source, target, path, wasPreprocessed) {
    let sourceType;
    let targetType;

    try {
      sourceType = JoeyTheDiffer.getType(source.processedValue, path);
      targetType = JoeyTheDiffer.getType(target.processedValue, path);
    } catch (error) {
      if (this.extendedTypesDiffer) {
        return this.customCompare(this.extendedTypesDiffer, source, target, path, wasPreprocessed);
      }

      throw error;
    }

    if (sourceType.isPrimitive || targetType.isPrimitive) {
      return this.comparePrimitiveTypes(
        { ...source, type: sourceType },
        { ...target, type: targetType },
        path,
        wasPreprocessed,
      );
    }

    return this.compareObjects(source.processedValue, target.processedValue, path);
  }

  /**
   * @param {*} value
   * @param {Array} path
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

    throw new TypeError(`Unsupported type "${typeString}" at ${path.length ? `path "${path.join('.')}"` : 'root path'}! Do you need the "extendedTypesDiffer" option?`);
  }

  /**
   * @param {Object} source
   * @param {Object} target
   * @param {Array} path
   * @param {boolean} wasPreprocessed
   * @return {Array} change
   */
  comparePrimitiveTypes(source, target, path, wasPreprocessed) {
    const areEqual = source.processedValue === target.processedValue;

    if (areEqual) {
      return [];
    }

    const change = {
      path: this.returnPathAsAnArray ? path : path.join('.'),
      source: source.value,
      target: target.value,
      meta: {},
    };

    const { meta } = change;

    if (source.type.name === target.type.name) {
      meta.op = 'replace';
      meta.reason = `different ${source.type.name}s`;
    } else if (!this.allowNewTargetProperties && source.type.name === 'undefined') {
      meta.op = 'add';
      meta.reason = 'value appeared';
    } else if (target.type.name === 'undefined') {
      meta.op = 'remove';
      meta.reason = 'value disappeared';
    } else {
      meta.op = 'replace';
      meta.reason = `type changed from "${source.type.name}" to "${target.type.name}"`;
    }

    if (wasPreprocessed) {
      meta.preprocessor = {
        source: source.processedValue,
        target: target.processedValue,
      };
    }

    return [change];
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
        const newPath = [...path, key];

        if (
          (typeof targetValue === 'undefined')
          || (key in source)
          || this.findProcessors(newPath).isBlackListed
        ) {
          return [];
        }

        return {
          path: this.returnPathAsAnArray ? newPath : newPath.join('.'),
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
