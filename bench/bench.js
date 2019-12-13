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


const cleanup = (file) => {
  try {
    fs.unlinkSync(file);
  } catch (err) {
    // Do nothing.
  }
};

// Cleanaup possible previous test.
cleanup(nt_output);
cleanup(mktorrent_output);


// nt
const nt = async () => new Promise((resolve, reject) => {
  console.time('nt');

  const child = spawn('nt', [
    'make', '-a', 'http://whatever.com',
    '-o', nt_output, file
  ]); 

  child.stderr.on('data', (data) => {
    reject(new Error(data.toString()));
  });

  child.stdout.resume();

  child.on('close', () => {
    console.timeEnd('nt');
    resolve();
  });
});


// mktorrent
const mktorrent = async () => new Promise((resolve, reject) => {
  console.time('mktorrent');
  const child = spawn('mktorrent', [
    '-a', 'http://whatever.com',
    '-o', mktorrent_output, file
  ]); 
  
  child.stderr.on('data', (data) => {
    reject(new Error(data.toString()));
  });

  child.stdout.resume();

  child.on('close', () => {
    console.timeEnd('mktorrent');
    resolve();
  });
});


// Start.
(async () => {
  console.log('Starting');
  await nt();
  await mktorrent();
  console.log('Finished');
})();
