#!/usr/bin/env node

require('yargs')
  .command(require('./nt-make'))
  .command(require('./nt-edit'))
  .command(require('./nt-hashcheck'))
  .command('get <field> <torrent>', 'Prints field from torrent', (yargs) => {
    const get = (cb) => (argv) => {
      const nt = require('nt');
      const util = require('./util');
      nt.read(argv.torrent, (err, torrent) => {
        if (err) util.logerr(err);
        const results = cb(torrent);
        if (results) {
          console.log(Array.isArray(results) ? results.join('\n') : results);
        }
      });
    };
    return yargs
      .command('infohash <torrent>',
        'Prints info hash from torrent', {}, get(torrent => torrent.infoHash()))
      .command('pieces <torrent>',
        'Prints piece hashes from torrent', {}, get(torrent => {
          const piece = 20;
          const len = torrent.metadata.info.pieces.length / piece;
          const results = [];
          for (let i = 0; i < len; i++) {
            const from = i * piece;
            const to = (i + 1) * piece;
            results.push(torrent.metadata.info.pieces.toString('hex', from, to));
          }
          return results;
        }))
      .command('name <torrent>',
        'Prints name from torrent', {}, get(torrent => torrent.metadata.info.name))
      .command('announce <torrent>',
        'Prints announce url from torrent', {}, get(torrent => {
          return torrent.metadata.announce;
        }))
      .command('announce-list <torrent>',
        'Prints announce-list urls from torrent', {}, get(torrent => {
          return torrent.metadata['announce-list'];
        }))
      .command('files <torrent>',
        'Prints file paths and lengths from torrent', {}, get(torrent => {
          const files = torrent.metadata.info.files;
          return files ?
            files.map(file => file.path + '\t' + file.length) :
            torrent.metadata.info.name + '\t' + torrent.metadata.info.length;
        }))
      .command('urllist <torrent>',
        'Prints web seed urls from torrent', {}, get(torrent => {
          return torrent.metadata['url-list'];
        }));
  })
  .demandCommand()
  .help()
  .argv;
