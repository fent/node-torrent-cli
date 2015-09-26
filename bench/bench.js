/**
 * Benchmarks nt against mktorrent
 * Run with `node bench.js <file>`
 */

var spawn = require('child_process').spawn;
var fs    = require('fs');


if (process.argv.length < 3) {
  console.log('Must provide file');
  process.exit(1);
}


var nt_output = 'nt.torrent';
var mktorrent_output = 'mktorrent.torrent';
var file = process.argv[2];


// Cleanaup possible previous test.
cleanup(nt_output);
cleanup(mktorrent_output);

function cleanup(file) {
  try {
    fs.unlinkSync(file);
  } catch (err) {}
}


// nt
function nt() {
  console.time('nt');

  var child = spawn('nt', ['make', '-a', 'http://whatever.com',
                          '-o', nt_output, file]); 

  child.stderr.on('data', function(data) {
    throw new Error(data.toString());
  });

  child.stdout.resume();

  child.on('close', function() {
    console.timeEnd('nt');
    mktorrent();
  });
}


// mktorrent
function mktorrent() {
  console.time('mktorrent');
  var child = spawn('mktorrent', ['-a', 'http://whatever.com',
                                  '-o', mktorrent_output, file]); 
  
  child.stderr.on('data', function(data) {
    throw new Error(data.toString());
  });

  child.stdout.resume();

  child.on('close', function() {
    console.timeEnd('mktorrent');
    console.log('Finished');
  });
}


// Start.
console.log('Starting');
nt();
