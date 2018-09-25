#!/usr/bin/env node

const parser = require('nomnom')()
  .script('nt')
  .colors();

parser
  .nocommand()
  .callback(() => {
    parser.print(parser.getUsage());
  });

parser
  .command('make')
  .help('Make a torrent')
  .callback(() => {
    process.nextTick(() => make());
  })
  .option('announceList', {
    abbr     : 'a',
    full     : 'announce',
    list     : true,
    required : true,
    metavar  : 'URL',
    help     : 'Announce URL. At least one is required',
  })
  .option('comment', {
    abbr    : 'c',
    metavar : 'STR',
    help    : 'Add a comment to the metainfo',
  })
  .option('name', {
    abbr    : 'n',
    metavar : 'STR',
    help    : 'Name of torrent',
  })
  .option('pieceLength', {
    abbr    : 'l',
    full    : 'piece-length',
    metavar : 'INT',
    help    : 'Set piece to 2^n bytes. Default : 256KB',
  })
  .option('private', {
    abbr : 'p',
    flag : true,
    help : 'Make this a private torrent',
  })
  .option('moreInfo', {
    abbr    : 's',
    metavar : 'STR',
    help    : 'Add more info to metainfo',
  })
  .option('output', {
    abbr    : 'o',
    metavar : 'PATH',
    help    : 'Where to write the output file',
  })
  .option('maxFiles', {
    abbr    : 'f',
    full    : 'max-files',
    metavar : 'INT',
    help    : 'Max simultaneous files to open',
  })
  .option('dir', {
    abbr    : 'd',
    metavar : 'PATH',
    default : process.cwd(),
    help    : 'Torrent root directory. Default : cwd',
  })
  .option('files', {
    position : 1,
    required : true,
    list     : true,
    help     : 'List of files to add to torrent',
  });
  
parser
  .command('edit')
  .help('Read a torrent, edit its metainfo variables, and write it. ' +
        'Can\'t change its files')
  .callback(() => {
    process.nextTick(() => edit());
  })
  .option('announceList', {
    abbr    : 'a',
    full    : 'announce',
    list    : true,
    metavar : 'URL',
    help    : 'Announce URL',
  })
  .option('comment', {
    abbr    : 'c',
    metavar : 'STR',
    help    : 'Add a comment to the metainfo'
  })
  .option('name', {
    abbr    : 'n',
    metavar : 'STR',
    help    : 'Name of torrent. Can only be changed in multi file mode.',
  })
  .option('private', {
    abbr : 'p',
    flag : true,
    help : 'Toggle this torrent\'s private mode',
  })
  .option('moreInfo', {
    abbr    : 's',
    metavar : 'STR',
    help    : 'Add more info to metainfo',
  })
  .option('output', {
    abbr    : 'o',
    metavar : 'PATH',
    help    : 'Where to write the output file. Default : original torrent',
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file to edit',
  });

parser
  .command('infohash')
  .help('Return info hash from torrent')
  .callback(() => {
    process.nextTick(() => infohash());
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file',
  });

parser
  .command('pieces')
  .help('Return piece hashes from torrent')
  .callback(() => {
    process.nextTick(() => pieces());
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file',
  });

parser
  .command('name')
  .help('Return name from torrent')
  .callback(() => {
    process.nextTick(() => torrentname());
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file',
  });

parser
  .command('announce')
  .help('Return announce url from torrent')
  .callback(() => {
    process.nextTick(() => announce());
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file',
  });

parser
  .command('announcelist')
  .help('Return announce-list urls from torrent')
  .callback(() => {
    process.nextTick(() => announcelist());
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file',
  });

parser
  .command('files')
  .help('Return file paths and lengths from torrent')
  .callback(() => {
    process.nextTick(() => files());
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file',
  });

parser
  .command('urllist')
  .help('Return web seed urls from torrent')
  .callback(() => {
    process.nextTick(() => urllist());
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file',
  });

parser
  .command('hashcheck')
  .help('Hash checks torrent file. If no directory is given, will use cwd')
  .callback(() => {
    process.nextTick(() => hashcheck());
  })
  .option('maxFiles', {
    abbr    : 'f',
    full    : 'max-files',
    metavar : 'INT',
    help    : 'Max simultaneous files to open',
  })
  .option('dir', {
    abbr    : 'd',
    metavar : 'PATH',
    default : process.cwd(),
    help    : 'Directory to hash check. Default : cwd',
  })
  .option('file', {
    position : 1,
    required : true,
    help     : 'Torrent file to hash check',
  });
    
const options = parser.parse();
const fs      = require('fs');
const path    = require('path');
const ss      = require('streamspeed');
const nt      = require('nt');
const util    = require('./util');
require('colors');


const make = () => {
  const announce = util.getAnnounce(options);
  if (!announce) {
    util.logerr('Must provide at least one announce URL');
  }

  let output = options.output || options.name || options.files[0];
  if (path.extname(output) !== '.torrent') output += '.torrent';

  const tmpOutput = output + '.tmp';
  const hasher = nt.makeWrite(tmpOutput, announce, options.dir,
    options.files, options);
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

const edit = () => {
  options.announce = util.getAnnounce(options);
  let output = options.output || options.file;
  if (path.extname(output) !== '.torrent') output += '.torrent';
  const tmpOutput = output + '.tmp';

  nt.read(options.file, (err, torrent) => {
    if (err) util.logerr(err);

    // Edit torrent object.
    const metadata = torrent.metadata;

    if (options.announce) {
      metadata.announce = options.announce;
    }

    if (options.announceList) {
      metadata['announce-list'] = options.announceList;
    }

    if (options.comment) {
      metadata.comment = options.comment;
    }

    if (options.name && metadata.info.files.length) {
      metadata.info.name = options.name;
    }

    if (options.private) {
      if (metadata.info.private) {
        delete metadata.info.private;
      } else {
        metadata.info.private = 1;
      }
    }

    // Add additional `moreInfo` to `info`.
    for (let moreKey in options.moreInfo) {
      // Only add `moreInfo` if it doesn't overwrite `info`.
      if (!Object.prototype.hasOwnProperty.call(metadata.info, moreKey)) {
        metadata.info[moreKey] = options.moreInfo[moreKey];
      }
    }

    // Write new torrent file.
    const ws = torrent.createWriteStream(tmpOutput);

    ws.on('error', util.logerr);
    ws.on('close', () => {
      fs.rename(tmpOutput, output, (err) => {
        if (err) util.logerr(err);

        console.log('File written to', output.bold);
      });
    });

  });
};

const infohash = () => {
  nt.read(options.file, (err, torrent) => {
    if (err) util.logerr(err);
    console.log(torrent.infoHash());
  });
};

const pieces = () => {
  nt.read(options.file, (err, torrent) => {
    if (err) util.logerr(err);
    const piece = 20;
    const len = torrent.metadata.info.pieces.length / piece;
    for (let i = 0; i < len; i++) {
      const from = i * piece;
      const to = (i + 1) * piece;
      console.log(torrent.metadata.info.pieces.toString('hex', from, to));
    }
  });
};

const torrentname = () => {
  nt.read(options.file, (err, torrent) => {
    if (err) util.logerr(err);
    console.log(torrent.metadata.info.name);
  });
};

const announce = () => {
  nt.read(options.file, (err, torrent) => {
    if (err) util.logerr(err);
    console.log(torrent.metadata.announce);
  });
};

const announcelist = () => {
  nt.read(options.file, (err, torrent) => {
    if (err) util.logerr(err);
    if (torrent.metadata.hasOwnProperty('announce-list'))
      console.log(torrent.metadata['announce-list']);
  });
};

const files = () => {
  nt.read(options.file, (err, torrent) => {
    if (err) util.logerr(err);
    const files = torrent.metadata.info.files;
    if (files) {
      for (let file of files) {
        console.log(file.path, file.length);
      }
    } else {
      console.log(torrent.metadata.info.name);
    }
  });
};

const urllist = () => {
  nt.read(options.file, (err, torrent) => {
    if (err) util.logerr(err);
    const list = torrent.metadata['url-list'];
    if (list) {
      for (let item of list) {
        console.log(item);
      }
    }
  });
};

const hashcheck = () => {
  nt.read(options.file, (err, torrent) => {
    if (err) util.logerr(err);

    const hasher = torrent.hashCheck(options.dir, options);
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
