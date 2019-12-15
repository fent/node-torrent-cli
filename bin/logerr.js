const chalk = require('chalk');


/**
 * Print any errors to stdout with colors and exit the script.
 *
 * @param {string} err
 */
module.exports = (err) => {
  process.stderr.write(chalk.bold.red('Error: ') + (err.message || err) + '\n');
  process.exit(1);
};
