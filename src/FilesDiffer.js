const { promises: fsPromises } = require('fs');
const nodePath = require('path');
const EventEmitter = require('events');

class FilesDiffer extends EventEmitter {
  /**
   * @param {Function} diffFn
   */
  constructor({ diffFn }) {
    super();
    this.diffFn = diffFn;
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
      fsPromises.stat(source),
      fsPromises.stat(target),
      fsPromises.stat(output).then((stats) => stats.isDirectory()).catch(() => false),
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
        (await fsPromises.readdir(target)).map((fileName) => nodePath.resolve(target, fileName)),
        output,
        isOutputADirectory,
      );
    }

    if (sourceStats.isDirectory() && targetStats.isFile()) {
      return this.diffCombination(
        (await fsPromises.readdir(source)).map((fileName) => nodePath.resolve(source, fileName)),
        [nodePath.resolve(target)],
        output,
        isOutputADirectory,
      );
    }

    if (sourceStats.isDirectory() && targetStats.isDirectory()) {
      return this.diffCombination(
        (await fsPromises.readdir(source)).map((fileName) => ({
          fileName,
          filePath: nodePath.resolve(source, fileName),
        })),
        (await fsPromises.readdir(target)).map((fileName) => ({
          fileName,
          filePath: nodePath.resolve(target, fileName),
        })),
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
      ? (fileName) => nodePath.resolve(output, fileName)
      : () => null;

    if (sourcesCount === 1) {
      const [source] = sources;
      diffsP = targets.map((target, index) => this.diffFiles(
        { source, target, output: getOuputFilePath(target) },
        index,
        targetsCount,
      ));
    } else if (targetsCount === 1) {
      const [target] = targets;
      diffsP = sources.map((source, index) => this.diffFiles(
        { source, target, output: getOuputFilePath(source) },
        index,
        sourcesCount,
      ));
    } else if (sourcesCount > 1 && targetsCount > 1) {
      const targetsObj = targets.reduce((acc, { fileName, filePath }) => ({
        ...acc,
        [fileName]: filePath,
      }), {});

      const filteredSources = sources.filter(({ fileName }) => targetsObj[fileName]);
      const filteredSourcesCount = filteredSources.length;

      diffsP = filteredSources.map(({ fileName, filePath: source }, index) => this.diffFiles(
        { source, target: targetsObj[fileName], output: getOuputFilePath(fileName) },
        index,
        filteredSourcesCount,
      ));
    }

    const allResults = await Promise.all(diffsP);

    if (!isOutputADirectory && output) {
      const outputFilePath = nodePath.resolve(output);
      const diffEvent = { output, current: 1, total: 1 };
      await this.saveResults(outputFilePath, allResults, diffEvent);
    }

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
      fsPromises.readFile(source, { encoding: 'utf8' }).then((json) => JSON.parse(json)),
      fsPromises.readFile(target, { encoding: 'utf8' }).then((json) => JSON.parse(json)),
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
   * @param {Object} diffEvent
   */
  async saveResults(output, results, diffEvent) {
    const saveEvent = { ...diffEvent, output };

    this.emit('save:file:start', saveEvent);

    await fsPromises.writeFile(output, JSON.stringify(results, null, 2), { encoding: 'utf8' });

    this.emit('save:file:end', saveEvent);
  }
}

module.exports = FilesDiffer;
