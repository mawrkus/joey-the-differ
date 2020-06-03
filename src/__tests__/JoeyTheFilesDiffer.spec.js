/* eslint-disable global-require, import/no-dynamic-require */

const EventEmitter = require('events');
const fs = require('fs');

const { when } = require('jest-when-xt');

const JoeyTheFilesDiffer = require('../JoeyTheFilesDiffer');

function buildJoey() {
  const diffFn = jest.fn(() => []);

  const fsPromises = {
    stat: fs.promises.stat,
    readdir: fs.promises.readdir,
    readFile: fs.promises.readFile,
    writeFile: jest.fn(async () => {}),
  };

  const joeyTheFilesDiffer = new JoeyTheFilesDiffer({
    diffFn,
    fsPromises,
  });

  return {
    diffFn,
    fsPromises,
    joeyTheFilesDiffer,
  };
}

const fixturesDirPath = `${__dirname}/fixtures`;

describe('JoeyTheFilesDiffer({ diffFn, fsPromises })', () => {
  it('should be a class with the following API: diff()', () => {
    const { joeyTheFilesDiffer } = buildJoey();
    expect(joeyTheFilesDiffer.diff).toBeInstanceOf(Function);
  });

  it('should inherit the EventEmitter class', () => {
    expect(Object.getPrototypeOf(JoeyTheFilesDiffer)).toBe(EventEmitter);
  });

  describe('#diff(source, target, output)', () => {
    describe('diffing 1 source file against 1 target file', () => {
      describe('with no output file', () => {
        it('should apply the diffing function to the content of each file and return the proper results', async () => {
          const { diffFn, joeyTheFilesDiffer } = buildJoey();

          const diffFnResults = [{ path: 'title' }, { path: 'author' }];
          diffFn.mockReturnValue(diffFnResults);

          const source = `${fixturesDirPath}/source.json`;
          const target = `${fixturesDirPath}/target.json`;
          const results = await joeyTheFilesDiffer.diff(source, target);

          expect(results).toEqual([{
            source,
            target,
            changes: diffFnResults,
          }]);
        });
      });

      describe('with an output file', () => {
        it('should save the results to the output file specified, as JSON', async () => {
          const { diffFn, fsPromises, joeyTheFilesDiffer } = buildJoey();

          const diffFnResults = [{ path: 'title' }, { path: 'author' }];
          diffFn.mockReturnValue(diffFnResults);

          jest.spyOn(joeyTheFilesDiffer, 'saveResults');

          const source = `${fixturesDirPath}/source.json`;
          const target = `${fixturesDirPath}/target.json`;
          const output = `${fixturesDirPath}/output.json`;
          const results = await joeyTheFilesDiffer.diff(source, target, output);

          expect(fsPromises.writeFile).toHaveBeenCalledWith(
            output,
            JSON.stringify(results, null, 2),
            { encoding: 'utf8' },
          );
        });
      });

      describe('with an output directory', () => {
        it('should throw an error', async () => {
          const { joeyTheFilesDiffer } = buildJoey();

          const source = `${fixturesDirPath}/source.json`;
          const target = `${fixturesDirPath}/target.json`;
          const output = fixturesDirPath;
          const resultsP = joeyTheFilesDiffer.diff(source, target, output);

          await expect(resultsP).rejects
            .toThrow(`"${output}" is a directory, please specifiy an output file!`);
        });
      });
    });

    describe('diffing 1 source file against 1 target directory', () => {
      describe('with no output file', () => {
        it('should apply the diffing function to the content of each file found in the target directory and return the proper results', async () => {
          const { diffFn, joeyTheFilesDiffer } = buildJoey();

          const source = `${fixturesDirPath}/bulk/sources/1.json`;
          const target = `${fixturesDirPath}/bulk/targets`;

          const sourceContent = require(source);
          const target1Content = require(`${target}/1.json`);
          const target2Content = require(`${target}/2.json`);
          const target3Content = require(`${target}/3.json`);

          when(diffFn)
            .calledWith(sourceContent, target1Content)
            .mockReturnValue([1]);
          when(diffFn)
            .calledWith(sourceContent, target2Content)
            .mockReturnValue([2]);
          when(diffFn)
            .calledWith(sourceContent, target3Content)
            .mockReturnValue([3]);

          const results = await joeyTheFilesDiffer.diff(source, target);

          expect(diffFn).toHaveBeenCalledWith(sourceContent, target1Content);
          expect(diffFn).toHaveBeenCalledWith(sourceContent, target2Content);
          expect(diffFn).toHaveBeenCalledWith(sourceContent, target3Content);

          expect(results).toEqual([
            { source, target: `${fixturesDirPath}/bulk/targets/1.json`, changes: [1] },
            { source, target: `${fixturesDirPath}/bulk/targets/2.json`, changes: [2] },
            { source, target: `${fixturesDirPath}/bulk/targets/3.json`, changes: [3] },
          ]);
        });
      });

      describe('with an output file', () => {
        it('should save the combined results to the output file specified, as JSON', async () => {
          const { fsPromises, joeyTheFilesDiffer } = buildJoey();

          const source = `${fixturesDirPath}/bulk/sources/1.json`;
          const target = `${fixturesDirPath}/bulk/targets`;
          const output = `${fixturesDirPath}/bulk/output.json`;
          const results = await joeyTheFilesDiffer.diff(source, target, output);

          expect(fsPromises.writeFile).toHaveBeenCalledTimes(1);
          expect(fsPromises.writeFile).toHaveBeenCalledWith(
            output,
            JSON.stringify(results, null, 2),
            { encoding: 'utf8' },
          );
        });
      });

      describe('with an output directory', () => {
        it('should save each results to a file in the output directory specified, as JSON', async () => {
          const { diffFn, fsPromises, joeyTheFilesDiffer } = buildJoey();

          const source = `${fixturesDirPath}/bulk/sources/1.json`;
          const target = `${fixturesDirPath}/bulk/targets`;

          const sourceContent = require(source);
          const target1Content = require(`${target}/1.json`);
          const target2Content = require(`${target}/2.json`);
          const target3Content = require(`${target}/3.json`);

          when(diffFn)
            .calledWith(sourceContent, target1Content)
            .mockReturnValue([1]);
          when(diffFn)
            .calledWith(sourceContent, target2Content)
            .mockReturnValue([2]);
          when(diffFn)
            .calledWith(sourceContent, target3Content)
            .mockReturnValue([3]);

          const output = `${fixturesDirPath}/bulk/diffs`;
          const results = await joeyTheFilesDiffer.diff(source, target, output);

          expect(fsPromises.writeFile).toHaveBeenCalledTimes(3);
          expect(fsPromises.writeFile).toHaveBeenCalledWith(
            `${output}/1.json`,
            JSON.stringify(results[0], null, 2),
            { encoding: 'utf8' },
          );
          expect(fsPromises.writeFile).toHaveBeenCalledWith(
            `${output}/2.json`,
            JSON.stringify(results[1], null, 2),
            { encoding: 'utf8' },
          );
          expect(fsPromises.writeFile).toHaveBeenCalledWith(
            `${output}/3.json`,
            JSON.stringify(results[2], null, 2),
            { encoding: 'utf8' },
          );
        });
      });
    });

    describe('diffing 1 source directory against 1 target file', () => {
      describe('with no output file', () => {
        it('should apply the diffing function to the content of each file found in the source directory and return the proper results', async () => {
          const { diffFn, joeyTheFilesDiffer } = buildJoey();

          const source = `${fixturesDirPath}/bulk/sources`;
          const target = `${fixturesDirPath}/bulk/targets/1.json`;

          const source1Content = require(`${source}/1.json`);
          const source2Content = require(`${source}/2.json`);
          const targetContent = require(target);

          when(diffFn)
            .calledWith(source1Content, targetContent)
            .mockReturnValue([1]);
          when(diffFn)
            .calledWith(source2Content, targetContent)
            .mockReturnValue([2]);

          const results = await joeyTheFilesDiffer.diff(source, target);

          expect(diffFn).toHaveBeenCalledWith(source1Content, targetContent);
          expect(diffFn).toHaveBeenCalledWith(source2Content, targetContent);

          expect(results).toEqual([
            { source: `${fixturesDirPath}/bulk/sources/1.json`, target, changes: [1] },
            { source: `${fixturesDirPath}/bulk/sources/2.json`, target, changes: [2] },
          ]);
        });
      });

      describe('with an output file', () => {
        it('should save the combined results to the output file specified, as JSON', async () => {
          const { fsPromises, joeyTheFilesDiffer } = buildJoey();

          const source = `${fixturesDirPath}/bulk/sources`;
          const target = `${fixturesDirPath}/bulk/targets/1.json`;
          const output = `${fixturesDirPath}/bulk/output.json`;
          const results = await joeyTheFilesDiffer.diff(source, target, output);

          expect(fsPromises.writeFile).toHaveBeenCalledTimes(1);
          expect(fsPromises.writeFile).toHaveBeenCalledWith(
            output,
            JSON.stringify(results, null, 2),
            { encoding: 'utf8' },
          );
        });
      });

      describe('with an output directory', () => {
        it('should save each results to a file in the output directory specified, as JSON', async () => {
          const { diffFn, fsPromises, joeyTheFilesDiffer } = buildJoey();

          const source = `${fixturesDirPath}/bulk/sources`;
          const target = `${fixturesDirPath}/bulk/targets/1.json`;

          const source1Content = require(`${source}/1.json`);
          const source2Content = require(`${source}/2.json`);
          const targetContent = require(target);

          when(diffFn)
            .calledWith(source1Content, targetContent)
            .mockReturnValue([1]);
          when(diffFn)
            .calledWith(source2Content, targetContent)
            .mockReturnValue([2]);

          const output = `${fixturesDirPath}/bulk/diffs`;
          const results = await joeyTheFilesDiffer.diff(source, target, output);

          expect(fsPromises.writeFile).toHaveBeenCalledTimes(2);
          expect(fsPromises.writeFile).toHaveBeenCalledWith(
            `${output}/1.json`,
            JSON.stringify(results[0], null, 2),
            { encoding: 'utf8' },
          );
          expect(fsPromises.writeFile).toHaveBeenCalledWith(
            `${output}/2.json`,
            JSON.stringify(results[1], null, 2),
            { encoding: 'utf8' },
          );
        });
      });
    });

    describe('diffing 1 source directory against 1 target directory', () => {
      describe('with no output file', () => {
        it('should apply the diffing function to the content of each matching file pairs found in the directories and return the proper results', async () => {
          const { diffFn, joeyTheFilesDiffer } = buildJoey();

          const source = `${fixturesDirPath}/bulk/sources`;
          const target = `${fixturesDirPath}/bulk/targets`;

          const source1Content = require(`${source}/1.json`);
          const source2Content = require(`${source}/2.json`);
          const target1Content = require(`${target}/1.json`);
          const target2Content = require(`${target}/2.json`);

          when(diffFn)
            .calledWith(source1Content, target1Content)
            .mockReturnValue([1]);
          when(diffFn)
            .calledWith(source2Content, target2Content)
            .mockReturnValue([2]);

          const results = await joeyTheFilesDiffer.diff(source, target);

          expect(diffFn).toHaveBeenCalledWith(source1Content, target1Content);
          expect(diffFn).toHaveBeenCalledWith(source2Content, target2Content);

          expect(results).toEqual([
            {
              source: `${fixturesDirPath}/bulk/sources/1.json`,
              target: `${fixturesDirPath}/bulk/targets/1.json`,
              changes: [1],
            },
            {
              source: `${fixturesDirPath}/bulk/sources/2.json`,
              target: `${fixturesDirPath}/bulk/targets/2.json`,
              changes: [2],
            },
          ]);
        });
      });

      describe('with an output file', () => {
        it('should save the combined results to the output file specified, as JSON', async () => {
          const { fsPromises, joeyTheFilesDiffer } = buildJoey();

          const source = `${fixturesDirPath}/bulk/sources`;
          const target = `${fixturesDirPath}/bulk/targets`;
          const output = `${fixturesDirPath}/bulk/output.json`;
          const results = await joeyTheFilesDiffer.diff(source, target, output);

          expect(fsPromises.writeFile).toHaveBeenCalledTimes(1);
          expect(fsPromises.writeFile).toHaveBeenCalledWith(
            output,
            JSON.stringify(results, null, 2),
            { encoding: 'utf8' },
          );
        });
      });

      describe('with an output directory', () => {
        it('should save each results to a file in the output directory specified, as JSON', async () => {
          const { diffFn, fsPromises, joeyTheFilesDiffer } = buildJoey();

          const source = `${fixturesDirPath}/bulk/sources`;
          const target = `${fixturesDirPath}/bulk/targets`;

          const source1Content = require(`${source}/1.json`);
          const source2Content = require(`${source}/2.json`);
          const target1Content = require(`${target}/1.json`);
          const target2Content = require(`${target}/2.json`);

          when(diffFn)
            .calledWith(source1Content, target1Content)
            .mockReturnValue([1]);
          when(diffFn)
            .calledWith(source2Content, target2Content)
            .mockReturnValue([2]);

          const output = `${fixturesDirPath}/bulk/diffs`;
          const results = await joeyTheFilesDiffer.diff(source, target, output);

          expect(fsPromises.writeFile).toHaveBeenCalledTimes(2);
          expect(fsPromises.writeFile).toHaveBeenCalledWith(
            `${output}/1.json`,
            JSON.stringify(results[0], null, 2),
            { encoding: 'utf8' },
          );
          expect(fsPromises.writeFile).toHaveBeenCalledWith(
            `${output}/2.json`,
            JSON.stringify(results[1], null, 2),
            { encoding: 'utf8' },
          );
        });
      });
    });

    describe('if "source" does not exist', () => {
      it('should throw an error', async () => {
        const { joeyTheFilesDiffer } = buildJoey();

        const source = `${fixturesDirPath}/xxx.json`;
        const target = `${fixturesDirPath}/target.json`;
        const resultsP = joeyTheFilesDiffer.diff(source, target);

        await expect(resultsP).rejects
          .toThrow(`ENOENT: no such file or directory, stat '${source}'`);
      });
    });

    describe('if "target" does not exist', () => {
      it('should throw an error', async () => {
        const { joeyTheFilesDiffer } = buildJoey();

        const source = `${fixturesDirPath}/source.json`;
        const target = `${fixturesDirPath}/xxx.json`;
        const resultsP = joeyTheFilesDiffer.diff(source, target);

        await expect(resultsP).rejects
          .toThrow(`ENOENT: no such file or directory, stat '${target}'`);
      });
    });

    describe('if neither "source" nor "target" are files or directories', () => {
      it('should throw an error', async () => {
        const { fsPromises, joeyTheFilesDiffer } = buildJoey();

        fsPromises.stat = jest.fn(async () => ({ isFile: () => false, isDirectory: () => false }));

        const resultsP = joeyTheFilesDiffer.diff('', '');

        await expect(resultsP).rejects
          .toThrow('Source and target must be either files or directories!');
      });
    });
  });
});
