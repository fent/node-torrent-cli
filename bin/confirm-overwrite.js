const fs = require('fs');
const yesno = require('yesno');


/**
 * Checks if output file already exists, and asks user for
 * confirmation to overwrite.
 *
 * @param {string} output
 */
module.exports = (output) => new Promise((resolve) => {
  fs.access(output, fs.constants.F_OK, (err) => {
    if (err) return resolve(true);
    resolve(yesno({
      question: `File \`${output}\` already exists, overwrite it?`,
    }));
  });
});
