#!/usr/bin/env node

/* eslint-disable no-console, object-curly-newline */

const path = require('path');
const program = require('commander');
const { version } = require('../package');

program
  .version(version)
  .option('-s, --source [file]', 'source file (JSON), required', String)
  .option('-t, --target [file]', 'target file (JSON), required', String)
  .option('-c, --config [file]', 'config file (JS), optional', String)
  .option('-o, --output [file]', 'output file (JSON), optional', String)
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
  joey.on('diff:file:start', ({ source, target, current, total }) => {
    console.info('[%d/%d] Diffing "%s" vs "%s"...', current, total, source, target);
  });

  joey.on('diff:file:end', ({ source, target, current, total, changes }) => {
    console.info('[%d/%d] "%s" vs "%s": %d change(s).', current, total, source, target, changes.length);
  });

  joey.on('save:file:start', ({ output, current, total }) => {
    console.info('[%d/%d] Saving "%s"...', current, total, output);
  });

  joey.on('save:file:end', ({ output, current, total }) => {
    console.info('[%d/%d] "%s" saved.', current, total, output);
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
