const { promises: fsPromises } = require('fs');
const nodePath = require('path');
const EventEmitter = require('events');

const flattenDeep = require('lodash.flattendeep');

const { toString } = Object.prototype;

class JoeyTheDiffer extends EventEmitter {
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
    super();

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
   * @param {string} source
   * @param {string} target
   * @param {string} [output]
   * @return {Promise.<Array>}
   */
  async diffFiles(source, target, output) {
    const [sourceStats, targetStats] = await Promise.all([
      fsPromises.stat(source),
      fsPromises.stat(target),
    ]);

    if (sourceStats.isFile() && targetStats.isFile()) {
      return this.diffFilesCombination(
        [nodePath.resolve(source)],
        [nodePath.resolve(target)],
        output,
      );
    }

    if (sourceStats.isFile() && targetStats.isDirectory()) {
      return this.diffFilesCombination(
        [nodePath.resolve(source)],
        (await fsPromises.readdir(target)).map((fileName) => nodePath.resolve(target, fileName)),
        output,
      );
    }

    if (sourceStats.isDirectory() && targetStats.isFile()) {
      return this.diffFilesCombination(
        (await fsPromises.readdir(source)).map((fileName) => nodePath.resolve(source, fileName)),
        [nodePath.resolve(target)],
        output,
      );
    }

    if (sourceStats.isDirectory() && targetStats.isDirectory()) {
      return this.diffFilesCombination(
        (await fsPromises.readdir(source)).map((fileName) => nodePath.resolve(source, fileName)),
        (await fsPromises.readdir(target)).map((fileName) => nodePath.resolve(target, fileName)),
        output,
      );
    }

    throw TypeError('Source and target must be either files or directories!');
  }

  /**
   * @param {string[]} sources
   * @param {string[]} targets
   * @param {string} [output]
   * @return {Promise.<Array>}
   */
  async diffFilesCombination(sources, targets, output) {
    let diffsP = [];
    const sourcesCount = sources.length;
    const targetsCount = targets.length;

    if (sourcesCount === 1) {
      const [source] = sources;

      diffsP = targets.map(async (target, index) => {
        const filePaths = { source, target, output };
        const changes = await this.diffBothFiles(filePaths, index, targetsCount);
        return { source, target, changes };
      });
    } else if (targetsCount === 1) {
      const [target] = targets;

      diffsP = sources.map(async (source, index) => {
        const filePaths = { source, target, output };
        const changes = await this.diffBothFiles(filePaths, index, sourcesCount);
        return { source, target, changes };
      });
    } else if (sourcesCount > 1 && targetsCount > 1) {
      throw new Error('TODO!');
    }

    return Promise.all(diffsP);
  }

  /**
   * @param {Object} filePaths
   * @param {Object} filePaths.source
   * @param {Object} filePaths.target
   * @param {Object} [filePaths.output]
   * @param {number} [index=0]
   * @param {number} [total=1]
   * @return {Promise.<Array>}
   */
  async diffBothFiles(filePaths, index = 0, total = 1) {
    const filesData = {
      source: filePaths.source,
      target: filePaths.target,
      current: index + 1,
      total,
    };
    this.emit('diff:file:start', filesData);

    const options = { encoding: 'utf8' };

    const [source, target] = await Promise.all([
      fsPromises.readFile(filePaths.source, options).then((json) => JSON.parse(json)),
      fsPromises.readFile(filePaths.target, options).then((json) => JSON.parse(json)),
    ]);

    const changes = this.diff(source, target);

    this.emit('diff:file:end', { ...filesData, changes });

    if (filePaths.output) {
      const output = nodePath.resolve(filePaths.output);
      const event = { ...filesData, output };

      this.emit('save:file:start', event);

      const results = { source: filePaths.source, target: filePaths.target, changes };

      await fsPromises.writeFile(output, JSON.stringify(results, null, 2), options);

      this.emit('save:file:end', event);
    }

    return changes;
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
   * @param {boolean} wasPreprocessed
   * @return {Array}
   */
  static customCompare(source, target, path, customDiffer, wasPreprocessed) {
    const { areEqual, meta } = customDiffer(source.processedValue, target.processedValue, path);

    if (wasPreprocessed) {
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
   * @param {boolean} wasPreprocessed
   * @return {Null|Object}
   */
  static comparePrimitiveTypes(source, target, path, wasPreprocessed) {
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
      meta: wasPreprocessed
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
        const newPath = [...path, key];

        if (
          (typeof targetValue === 'undefined')
          || (key in source)
          || this.findProcessors(newPath).isBlackListed
        ) {
          return [];
        }

        return {
          path: newPath.join('.'),
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
