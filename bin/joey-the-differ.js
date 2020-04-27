#!/usr/bin/env node

/* eslint-disable no-console */

const path = require('path');
const program = require('commander');
const ora = require('ora');
const { version } = require('../package');

program
  .version(version)
  .option('-s, --source [file]', 'source file (JSON), required', String)
  .option('-t, --target [file]', 'target file (JSON), required', String)
  .option('-c, --config [file]', 'config file (JS), optional', String)
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
} = program;

let options = {};

if (configFile) {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    options = require(path.resolve(configFile));
  } catch (error) {
    console.error(`Error while loading the JS config file "${program.config}"!`);
    console.error(error);
    process.exit(1);
  }
}

const JoeyTheDiffer = require('..');

const joey = new JoeyTheDiffer(options);

const spinner = ora({ spinner: 'dots4' }).start('🧬  Diffing...');

joey
  .diffFiles(sourceFile, targetFile)
  .then((changes) => {
    spinner.succeed('All good! :D');
    console.log(JSON.stringify(changes, null, 2));
  })
  .catch((error) => {
    spinner.fail('Ooops! Something went wrong. :(');
    console.error(error);
  });
