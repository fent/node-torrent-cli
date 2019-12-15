require('colors');


/**
 * Progress bar constants.
 *
 * @const
 */
const BAR   = '♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥';
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
  process.stdout.write(' ['.grey + BAR.substr(0, rounded).bold[color] +
    NOBAR.substr(0, BAR.length - rounded) + '] '.grey +
    percent.bold + '%'.grey + ' ' + speed.bold + '  \r');
};
