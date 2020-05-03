#!/usr/bin/env node

/* eslint-disable no-console, object-curly-newline */

const path = require('path');
const program = require('commander');
const { version } = require('../package');

program
  .version(version)
  .option('-s, --source [file]', 'source file or directory, required', String)
  .option('-t, --target [file]', 'target file or directory, required', String)
  .option('-o, --output [file]', 'output file or directory, optional', String)
  .option('-c, --config [file]', 'config file (JS), optional', String)
  .option('-v, --verbose', 'verbose mode, optional')
  .parse(process.argv);

['source', 'target'].forEach((f) => {
  if (!program[f]) {
    console.error(`Have you forgotten to specify a ${f} file? ;)`);
    program.help();
  }
});

const {
  source: sourceFile,
  target: targetFile,
  config: configFile,
  output: outputFile,
  verbose,
} = program;


let options = {};

if (configFile) {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    options = require(path.resolve(configFile));
  } catch (error) {
    console.error(`Error while loading the JS config file "${configFile}"!`);
    console.error(error);
    process.exit(1);
  }
}

const JoeyTheDiffer = require('..');

const joey = new JoeyTheDiffer(options);

if (verbose) {
  joey.filesDiffer.on('diff:files:start', ({ total }) => {
    console.info('%d file(s) to diff.', total);
  });

  joey.filesDiffer.on('diff:file:start', ({ source, target, current, total }) => {
    console.info('[%d/%d] Diffing...\n  %s\n  %s', current, total, source, target);
  });

  joey.filesDiffer.on('diff:file:end', ({ source, target, current, total, changes }) => {
    console.info('[%d/%d] Diffed: %d change(s).\n  %s\n  %s', current, total, changes.length, source, target);
  });

  joey.filesDiffer.on('save:file:start', ({ output, current, total }) => {
    console.info('[%d/%d] Saving...\n  %s...', current, total, output);
  });

  joey.filesDiffer.on('save:file:end', ({ output, current, total }) => {
    console.info('[%d/%d] Saved.\n  %s', current, total, output);
  });

  joey.filesDiffer.on('diff:files:end', ({ total }) => {
    console.info('Done diffing %d file(s).', total);
  });
}

joey
  .diffFiles(sourceFile, targetFile, outputFile)
  .then((results) => {
    if (!outputFile) {
      console.log(JSON.stringify(results, null, 2));
    }
  })
  .catch((error) => {
    console.error('Ooops! Something went wrong. :(');
    console.error(error);
  });
