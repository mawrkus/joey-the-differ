const { promises: fsPromises } = require('fs');
const nodePath = require('path');
const EventEmitter = require('events');

class FilesDiffer extends EventEmitter {
  constructor({ joey }) {
    super();
    this.joey = joey;
  }

  /**
   * @param {string} source
   * @param {string} target
   * @param {string} [output]
   * @return {Promise.<Array>}
   */
  async diff(source, target, output) {
    const [sourceStats, targetStats] = await Promise.all([
      fsPromises.stat(source),
      fsPromises.stat(target),
    ]);

    if (sourceStats.isFile() && targetStats.isFile()) {
      return this.diffCombination(
        [nodePath.resolve(source)],
        [nodePath.resolve(target)],
        output,
      );
    }

    if (sourceStats.isFile() && targetStats.isDirectory()) {
      return this.diffCombination(
        [nodePath.resolve(source)],
        (await fsPromises.readdir(target)).map((fileName) => nodePath.resolve(target, fileName)),
        output,
      );
    }

    if (sourceStats.isDirectory() && targetStats.isFile()) {
      return this.diffCombination(
        (await fsPromises.readdir(source)).map((fileName) => nodePath.resolve(source, fileName)),
        [nodePath.resolve(target)],
        output,
      );
    }

    if (sourceStats.isDirectory() && targetStats.isDirectory()) {
      return this.diffCombination(
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
  async diffCombination(sources, targets, output) {
    let diffsP = [];
    const sourcesCount = sources.length;
    const targetsCount = targets.length;

    if (sourcesCount === 1) {
      const [source] = sources;
      diffsP = targets.map((target, index) => this.diffFiles(
        { source, target, output },
        index,
        targetsCount,
      ));
    } else if (targetsCount === 1) {
      const [target] = targets;
      diffsP = sources.map((source, index) => this.diffFiles(
        { source, target, output },
        index,
        sourcesCount,
      ));
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
  async diffFiles(filePaths, index = 0, total = 1) {
    const diffEvent = {
      source: filePaths.source,
      target: filePaths.target,
      current: index + 1,
      total,
    };
    const readWriteOptions = { encoding: 'utf8' };

    this.emit('diff:file:start', diffEvent);

    const [source, target] = await Promise.all([
      fsPromises.readFile(filePaths.source, readWriteOptions).then((json) => JSON.parse(json)),
      fsPromises.readFile(filePaths.target, readWriteOptions).then((json) => JSON.parse(json)),
    ]);

    const changes = this.joey.diff(source, target);
    const results = { source: filePaths.source, target: filePaths.target, changes };

    this.emit('diff:file:end', { ...diffEvent, changes });

    if (filePaths.output) {
      const output = nodePath.resolve(filePaths.output);
      const saveEvent = { ...diffEvent, output };

      this.emit('save:file:start', saveEvent);

      await fsPromises.writeFile(output, JSON.stringify(results, null, 2), readWriteOptions);

      this.emit('save:file:end', saveEvent);
    }

    return results;
  }
}

module.exports = FilesDiffer;
