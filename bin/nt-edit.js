exports.command = 'edit <torrent>';
exports.describe = 'Edit a torrent\'ts metainfo, can\'t change its files';
exports.builder = {
  announce: {
    alias: 'a',
    describe: 'Announce URL of the tracker',
  },
  announceList: {
    describe: 'Announce URL list',
    array: true,
  },
  comment: {
    alias: 'c',
    describe: 'Add a comment to the metainfo',
  },
  name: {
    alias: 'n',
    describe: 'Name of torrent',
    defaultDescription: 'first file found',
  },
  private: {
    alias: 'p',
    boolean: true,
    describe: 'Make this a private torrent',
  },
  moreInfo: {
    alias: 's',
    describe: 'Add more info to metainfo',
  },
  output: {
    alias: 'o',
    describe: 'Outfile file',
    defaultDescription: 'torrent name',
    default: '',
    normalize: true,
  },
  yes: {
    alias: 'y',
    boolean: true,
    describe: 'Overwrite without asking'
  },
};
exports.handler = async (argv) => {
  const fs = require('fs');
  const path = require('path');
  const nt = require('nt');
  const logerr = require('./logerr');
  const confirmOverwrite = require('./confirm-overwrite');
  const chalk = require('chalk');


  let output = argv.output || argv.torrent;
  if (path.extname(output) !== '.torrent') output += '.torrent';
  const tmpOutput = output + '.tmp';
  if (!argv.yes && !await confirmOverwrite(output)) return;

  nt.read(argv.torrent, (err, torrent) => {
    if (err) logerr(err);

    // Edit torrent object.
    const metadata = torrent.metadata;

    if (argv.announce) {
      metadata.announce = argv.announce;
    }

    if (argv.announceList) {
      metadata['announce-list'] = argv.announceList;
    }

    if (argv.comment) {
      metadata.comment = argv.comment;
    }

    if (argv.name && metadata.info.files.length) {
      metadata.info.name = argv.name;
    }

    if (argv.private) {
      if (metadata.info.private) {
        delete metadata.info.private;
      } else {
        metadata.info.private = 1;
      }
    }

    // Add additional `moreInfo` to `info`.
    for (let moreKey in argv.moreInfo) {
      // Only add `moreInfo` if it doesn't overwrite `info`.
      if (!Object.prototype.hasOwnProperty.call(metadata.info, moreKey)) {
        metadata.info[moreKey] = argv.moreInfo[moreKey];
      }
    }

    // Write new torrent file.
    const ws = torrent.createWriteStream(tmpOutput);

    ws.on('error', logerr);
    ws.on('close', () => {
      fs.rename(tmpOutput, output, (err) => {
        if (err) logerr(err);

        console.log(`File written to \`${chalk.bold(output)}\``);
      });
    });

  });
};
