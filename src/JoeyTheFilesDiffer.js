const fs = require('fs');
const nodePath = require('path');
const EventEmitter = require('events');

const intersectionBy = require('lodash.intersectionby');

const JoeyTheDiffer = require('./JoeyTheDiffer');

class JoeyTheFilesDiffer extends EventEmitter {
  /**
   * @param {Object} options The same options as JoeyTheDiffer
   * @param {Function} [options.diffFn] For testing purposes
   * @param {Object} [options.fsPromises] For testing purposes
   * @param {AsyncFunction} options.fsPromises.stat
   * @param {AsyncFunction} options.fsPromises.readdir
   * @param {AsyncFunction} options.fsPromises.readFile
   * @param {AsyncFunction} options.fsPromises.writeFile
   */
  constructor(options) {
    super();

    if (options.diffFn) {
      this.diffFn = options.diffFn;
    } else {
      const joey = new JoeyTheDiffer(options);
      this.diffFn = joey.diff.bind(joey);
    }

    this.fsPromises = options.fsPromises || fs.promises;
  }

  /**
   * @param {string} source file or directoy path
   * @param {string} target file or directoy path
   * @param {string} [output] file or directoy path
   * @return {Promise.<Array>}
   */
  async diff(source, target, output) {
    const [
      sourceStats,
      targetStats,
      isOutputADirectory,
    ] = await Promise.all([
      this.fsPromises.stat(source),
      this.fsPromises.stat(target),
      this.fsPromises.stat(output).then((stats) => stats.isDirectory()).catch(() => false),
    ]);

    if (sourceStats.isFile() && targetStats.isFile()) {
      if (isOutputADirectory) {
        throw new TypeError(`"${output}" is a directory, please specifiy an output file!`);
      }

      return this.diffCombination(
        [nodePath.resolve(source)],
        [nodePath.resolve(target)],
        output,
        isOutputADirectory,
      );
    }

    if (sourceStats.isFile() && targetStats.isDirectory()) {
      return this.diffCombination(
        [nodePath.resolve(source)],
        (await this.fsPromises.readdir(target))
          .map((fileName) => nodePath.resolve(target, fileName)),
        output,
        isOutputADirectory,
      );
    }

    if (sourceStats.isDirectory() && targetStats.isFile()) {
      return this.diffCombination(
        (await this.fsPromises.readdir(source))
          .map((fileName) => nodePath.resolve(source, fileName)),
        [nodePath.resolve(target)],
        output,
        isOutputADirectory,
      );
    }

    if (sourceStats.isDirectory() && targetStats.isDirectory()) {
      return this.diffCombination(
        (await this.fsPromises.readdir(source)).map((fileName) => ({
          fileName,
          source: nodePath.resolve(source, fileName),
          target: nodePath.resolve(target, fileName),
        })),
        (await this.fsPromises.readdir(target)).map((fileName) => ({ fileName })),
        output,
        isOutputADirectory,
      );
    }

    throw TypeError('Source and target must be either files or directories!');
  }

  /**
   * @param {string[]} sources
   * @param {string[]|Object[]} targets
   * @param {string} [output]
   * @param {boolean} isOutputADirectory
   * @return {Promise.<Array>}
   */
  async diffCombination(sources, targets, output, isOutputADirectory) {
    let diffsP = [];
    const sourcesCount = sources.length;
    const targetsCount = targets.length;

    const getOuputFilePath = isOutputADirectory
      ? (fileName) => nodePath.resolve(output, nodePath.basename(fileName))
      : () => null;

    if (sourcesCount === 1) {
      const [source] = sources;

      this.emit('diff:files:start', { total: targetsCount });

      diffsP = targets.map((target, index) => this.diffFiles(
        { source, target, output: getOuputFilePath(target) },
        index,
        targetsCount,
      ));
    } else if (targetsCount === 1) {
      const [target] = targets;

      this.emit('diff:files:start', { total: sourcesCount });

      diffsP = sources.map((source, index) => this.diffFiles(
        { source, target, output: getOuputFilePath(source) },
        index,
        sourcesCount,
      ));
    } else if (sourcesCount > 1 && targetsCount > 1) {
      const pairs = intersectionBy(sources, targets, 'fileName');
      const pairsCount = pairs.length;

      this.emit('diff:files:start', { total: pairsCount });

      diffsP = pairs.map(({ fileName, source, target }, index) => this.diffFiles(
        { source, target, output: getOuputFilePath(fileName) },
        index,
        pairsCount,
      ));
    }

    const allResults = await Promise.all(diffsP);

    if (!isOutputADirectory && output) {
      await this.saveResults(nodePath.resolve(output), allResults);
    }

    this.emit('diff:files:end', { total: allResults.length });

    return allResults;
  }

  /**
   * @param {Object} filePaths
   * @param {Object} filePaths.source
   * @param {Object} filePaths.target
   * @param {Object} filePaths.output
   * @param {number} [index=0]
   * @param {number} [total=1]
   * @return {Promise.<Array>}
   */
  async diffFiles(filePaths, index = 0, total = 1) {
    const { source, target, output } = filePaths;
    const diffEvent = {
      source,
      target,
      current: index + 1,
      total,
    };

    this.emit('diff:file:start', diffEvent);

    const [sourceContent, targetContent] = await Promise.all([
      this.fsPromises.readFile(source, { encoding: 'utf8' }).then((json) => JSON.parse(json)),
      this.fsPromises.readFile(target, { encoding: 'utf8' }).then((json) => JSON.parse(json)),
    ]);

    const changes = this.diffFn(sourceContent, targetContent);
    const results = { source, target, changes };

    this.emit('diff:file:end', { ...diffEvent, changes });

    if (output) {
      await this.saveResults(nodePath.resolve(output), results, diffEvent);
    }

    return results;
  }

  /**
   * @param {string} output
   * @param {Object|Array} results
   * @param {Object} [diffEvent={ current: 1, total: 1 }]
   */
  async saveResults(output, results, diffEvent = { current: 1, total: 1 }) {
    const saveEvent = { ...diffEvent, output };

    this.emit('save:file:start', saveEvent);

    await this.fsPromises.writeFile(output, JSON.stringify(results, null, 2), { encoding: 'utf8' });

    this.emit('save:file:end', saveEvent);
  }
}

module.exports = JoeyTheFilesDiffer;
