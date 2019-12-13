exports.command = 'make <file> [files...]';
exports.describe = 'Make a torrent';
exports.builder = {
  announceList: {
    alias: 'a',
    describe: 'Announce URLs',
    array: true,
    demandOption: true
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
  pieceLength: {
    alias: 'i',
    describe: 'Set piece to 2^n bytes',
    defaultDescription: '256KB',
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
    normalize: true,
  },
  maxFiles: {
    alias: 'f',
    describe: 'Max simultaneous files to open',
    number: true,
  },
  dir: {
    alias: 'd',
    describe: 'Torrent root directory',
    normalize: true,
    default: process.cwd(),
    defaultDescription: 'cwd',
  }
};
exports.handler = (argv) => {
  const fs   = require('fs');
  const path = require('path');
  const ss   = require('streamspeed');
  const nt   = require('nt');
  const util = require('./util');
  require('colors');


  const announce = util.getAnnounce(argv);

  let output = argv.output || argv.name || argv.file;
  if (path.extname(output) !== '.torrent') output += '.torrent';

  const tmpOutput = output + '.tmp';
  const hasher = nt.makeWrite(tmpOutput, announce, argv.dir,
    [argv.file].concat(argv.files), argv);
  let infohash;

  nt.read(hasher, (err, torrent) => {
    if (err) util.logerr(err);
    infohash = torrent.infoHash();
  });

  console.time('Time taken');

  hasher.on('error', util.logerr);
  hasher.on('progress', (percent, speed, avg) => {
    util.progress(percent, ss.toHuman(avg, 's'));
  });

  // Prevent node from exiting.
  const iid = setInterval(() => {}, 500000);

  hasher.on('end', () => {
    clearInterval(iid);
    fs.rename(tmpOutput, output, (err) => {
      if (err) util.logerr(err);
      console.log('\nFinished writing torrent at', output.bold);
      console.log('Info hash:', infohash.bold);
      console.timeEnd('Time taken');
    });
  });

  // Clean up on forced exit.
  process.on('SIGINT', () => {
    clearInterval(iid);
    fs.unlink(tmpOutput, (err) => {
      if (err) util.logerr(err);
      process.stdout.write('\n');
      process.exit(1);
    });
  });

  process.on('SIGTSTP', () => {
    hasher.toggle();
  });
};
