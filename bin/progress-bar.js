const chalk = require('chalk');

/**
 * Progress bar constants.
 *
 * @const
 */
const BAR = '♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥';
const NOBAR = '♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡♡';
const CLEAR = '                                        ';

/**
 * Prints a progress bar at the given percent.
 *
 * @param {number} percent
 */
module.exports = (percent, speed, color) => {
  color = color || 'green';
  const rounded = Math.round(percent / (100 / BAR.length));

  // Pad percent.
  percent = percent.toFixed(2);
  percent = CLEAR.substr(0, 6 - percent.length) + percent;

  // Print to stdout.
  process.stdout.write(
    chalk.gray(' [') +
      chalk.bold[color](BAR.substr(0, rounded)) +
      NOBAR.substr(0, BAR.length - rounded) +
      chalk.gray('] ') +
      chalk.bold(percent) +
      chalk.gray('%') +
      ' ' +
      chalk.bold(speed) +
      '  \r',
  );
};
