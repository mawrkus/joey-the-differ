#!/usr/bin/env node

/* eslint-disable no-console */

const program = require('commander');
const ora = require('ora');
const { version } = require('../package');

program
  .version(version)
  .option('-s, --source [file]', 'source JSON file, required', String, '')
  .option('-t, --target [file]', 'target JSON file, required', String, '')
  .parse(process.argv);

['source', 'target'].forEach((f) => {
  if (!program[f]) {
    console.error(`Have you forgotten to specify a ${f} file? ;)`);
    program.help();
  }
});

const JoeyTheDiffer = require('..');

const options = {};
const joey = new JoeyTheDiffer(options);
const { source: sourceFile, target: targetFile } = program;

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
