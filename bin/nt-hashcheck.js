exports.command = 'hashcheck <torrent>';
exports.describe = 'Hash checks torrent file';
exports.builder = {
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
  },
};
exports.handler = (argv) => {
  const ss   = require('streamspeed');
  const nt   = require('nt');
  const util = require('./util');


  nt.read(argv.torrent, (err, torrent) => {
    if (err) util.logerr(err);

    const hasher = torrent.hashCheck(argv.dir, argv);
    console.time('Time taken');

    hasher.on('error', util.logerr);

    let color, avg = 0;
    hasher.on('progress', (percent, speed, a) => {
      avg = a;
    });

    hasher.on('match', (i, hash, percent) => {
      util.progress(percent, ss.toHuman(avg, 's'), color);
    });

    // Change progress bar color to read on match error.
    hasher.on('matcherror', () => {
      color = 'red';
    });

    // Prevent node from exiting.
    const iid = setInterval(() => {}, 500000);

    hasher.on('end', () => {
      clearInterval(iid);
      console.log('\nFinished hash checking torrent');
      console.timeEnd('Time taken');
    });

    process.on('SIGINT', () => {
      clearInterval(iid);
      process.stdout.write('\n');
      process.exit(1);
    });

    process.on('SIGTSTP', () => {
      hasher.toggle();
    });
  });
};
