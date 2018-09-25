/**
 * Benchmarks nt against mktorrent
 * Run with `node bench.js <file>`
 */

const spawn = require('child_process').spawn;
const fs    = require('fs');


if (process.argv.length < 3) {
  console.log('Must provide file');
  process.exit(1);
}


const nt_output = 'nt.torrent';
const mktorrent_output = 'mktorrent.torrent';
const file = process.argv[2];


// Cleanaup possible previous test.
cleanup(nt_output);
cleanup(mktorrent_output);

function cleanup(file) {
  try {
    fs.unlinkSync(file);
  } catch (err) {
    // Do nothing.
  }
}


// nt
const nt = () => {
  console.time('nt');

  const child = spawn('nt', [
    'make', '-a', 'http://whatever.com',
    '-o', nt_output, file
  ]); 

  child.stderr.on('data', (data) => {
    throw new Error(data.toString());
  });

  child.stdout.resume();

  child.on('close', () => {
    console.timeEnd('nt');
    mktorrent();
  });
};


// mktorrent
const mktorrent = () => {
  console.time('mktorrent');
  const child = spawn('mktorrent', [
    '-a', 'http://whatever.com',
    '-o', mktorrent_output, file
  ]); 
  
  child.stderr.on('data', (data) => {
    throw new Error(data.toString());
  });

  child.stdout.resume();

  child.on('close', () => {
    console.timeEnd('mktorrent');
    console.log('Finished');
  });
};


// Start.
console.log('Starting');
nt();
