const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { execFile } = require('child_process');

const BIN = path.join(__dirname, '../bin/nt.js');
const pkg = require('../package.json');

const run = (args, options = {}) => {
  return new Promise((resolve, reject) => {
    const child = execFile(
      process.execPath,
      [BIN, ...args],
      { cwd: __dirname, ...options },
      (err, stdout, stderr) => {
        if (err) {
          err.stdout = stdout;
          err.stderr = stderr;
          return reject(err);
        }
        resolve({ stdout, stderr });
      },
    );
    if (options.input) {
      child.stdin.write(options.input);
      child.stdin.end();
    }
  });
};

describe('nt cli', () => {
  const testFile = 'test-file.txt';
  const torrentFile = 'test-file.torrent';
  const testFilePath = path.join(__dirname, testFile);
  const torrentFilePath = path.join(__dirname, torrentFile);

  before(() => {
    fs.writeFileSync(testFilePath, 'hello world torrent test content');
  });

  after(() => {
    const toClean = [
      testFile,
      torrentFile,
      'file2.txt',
      'multi.torrent',
      'custom-name.torrent',
      'corrupt.txt',
      'corrupt.torrent',
      'fresh.torrent',
      'ann-edit.torrent',
      'invalid.torrent',
    ];
    for (const f of toClean) {
      const p = path.join(__dirname, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  });

  it('prints help with --help', async () => {
    const { stdout } = await run(['--help']);
    assert.ok(stdout.includes('Commands:'));
    assert.ok(stdout.includes('nt.js make'));
  });

  it('prints version with --version', async () => {
    const { stdout } = await run(['--version']);
    assert.equal(stdout.trim(), pkg.version);
  });

  it('makes a torrent', async () => {
    const { stdout } = await run([
      'make',
      testFile,
      '-a',
      'http://tracker.example.com/announce',
      '-o',
      torrentFile,
      '-y',
    ]);
    assert.ok(stdout.includes('File written to'));
    assert.ok(stdout.includes('Info hash:'));
    assert.ok(fs.existsSync(torrentFilePath));
  });

  it('makes a torrent without -y when target does not exist', async () => {
    const { stdout } = await run([
      'make',
      testFile,
      '-a',
      'http://tracker.example.com/announce',
      '-o',
      'fresh.torrent',
    ]);
    assert.ok(stdout.includes('File written to'));
    assert.ok(fs.existsSync(path.join(__dirname, 'fresh.torrent')));
  });

  it('gets torrent infohash', async () => {
    const { stdout } = await run(['get', 'infohash', torrentFile]);
    assert.equal(stdout.trim().length, 40);
  });

  it('gets torrent name', async () => {
    const { stdout } = await run(['get', 'name', torrentFile]);
    assert.equal(stdout.trim(), 'test-file.txt');
  });

  it('gets torrent announce', async () => {
    const { stdout } = await run(['get', 'announce', torrentFile]);
    assert.equal(stdout.trim(), 'http://tracker.example.com/announce');
  });

  it('gets torrent announce-list', async () => {
    const bncode = require('bncode');
    const decoded = bncode.decode(fs.readFileSync(torrentFilePath));
    decoded['announce-list'] = [
      [Buffer.from('http://tracker.example.com/announce')],
    ];
    fs.writeFileSync(torrentFilePath, bncode.encode(decoded));
    const { stdout } = await run(['get', 'announce-list', torrentFile]);
    assert.ok(stdout.includes('http://tracker.example.com/announce'));
  });

  it('gets torrent files', async () => {
    const { stdout } = await run(['get', 'files', torrentFile]);
    assert.ok(stdout.includes('test-file.txt'));
  });

  it('gets torrent pieces', async () => {
    const { stdout } = await run(['get', 'pieces', torrentFile]);
    assert.equal(stdout.trim().length, 40);
  });

  it('hashchecks torrent', async () => {
    const { stdout } = await run(['hashcheck', torrentFile, '-d', __dirname]);
    assert.ok(stdout.includes('Finished hash checking torrent'));
  });

  it('edits torrent', async () => {
    const { stdout } = await run([
      'edit',
      torrentFile,
      '-a',
      'http://newtracker.example.com/announce',
      '-c',
      'my test comment',
      '-p',
      '-s.customField',
      'customValue',
      '-y',
    ]);
    assert.ok(stdout.includes('File written to'));
    const announceRes = await run(['get', 'announce', torrentFile]);
    assert.equal(
      announceRes.stdout.trim(),
      'http://newtracker.example.com/announce',
    );
  });

  it('edits torrent announceList', async () => {
    const { stdout } = await run([
      'edit',
      torrentFile,
      '--announceList',
      'http://custom-tracker.example.com',
      '-o',
      'ann-edit.torrent',
      '-y',
    ]);
    assert.ok(stdout.includes('File written to'));
    assert.ok(fs.existsSync(path.join(__dirname, 'ann-edit.torrent')));
  });

  it('makes a multi-file torrent with options', async () => {
    fs.writeFileSync(path.join(__dirname, 'file2.txt'), 'second file');
    const { stdout } = await run([
      'make',
      testFile,
      'file2.txt',
      '-a',
      'http://tracker1.example.com/announce',
      '-c',
      'multi comment',
      '-p',
      '-s.url-list',
      'http://webseed.example.com',
      '-o',
      'multi.torrent',
      '-y',
    ]);
    assert.ok(stdout.includes('File written to'));
    assert.ok(fs.existsSync(path.join(__dirname, 'multi.torrent')));
  });

  it('makes a torrent with custom name when -o is omitted', async () => {
    const { stdout } = await run([
      'make',
      testFile,
      '-a',
      'http://tracker.example.com/announce',
      '-n',
      'custom-name',
      '-y',
    ]);
    assert.ok(stdout.includes('File written to'));
    assert.ok(fs.existsSync(path.join(__dirname, 'custom-name.torrent')));
  });

  it('prompts user and aborts overwrite when answering no', async () => {
    const { stdout } = await run(
      [
        'make',
        testFile,
        '-a',
        'http://tracker.example.com/announce',
        '-o',
        torrentFile,
      ],
      { input: 'no\n' },
    );
    assert.ok(stdout.includes('already exists, overwrite it?'));
  });

  it('prompts user and overwrites when answering yes', async () => {
    const { stdout } = await run(
      [
        'make',
        testFile,
        '-a',
        'http://tracker.example.com/announce',
        '-o',
        torrentFile,
      ],
      { input: 'yes\n' },
    );
    assert.ok(stdout.includes('already exists, overwrite it?'));
    assert.ok(stdout.includes('File written to'));
  });

  it('gets multi-file torrent files', async () => {
    const { stdout } = await run(['get', 'files', 'multi.torrent']);
    assert.ok(stdout.includes(testFile));
    assert.ok(stdout.includes('file2.txt'));
  });

  it('gets urllist', async () => {
    const { stdout } = await run(['get', 'urllist', 'multi.torrent']);
    assert.equal(stdout, '');
  });

  it('hashchecks torrent with matcherror on corrupted file', async () => {
    fs.writeFileSync(path.join(__dirname, 'corrupt.txt'), 'original content');
    await run([
      'make',
      'corrupt.txt',
      '-a',
      'http://tracker.example.com/announce',
      '-o',
      'corrupt.torrent',
      '-y',
    ]);
    fs.writeFileSync(
      path.join(__dirname, 'corrupt.txt'),
      'modified content 123',
    );
    const { stdout } = await run([
      'hashcheck',
      'corrupt.torrent',
      '-d',
      __dirname,
    ]);
    assert.ok(stdout.includes('Finished hash checking torrent'));
  });

  it('edits multi-file torrent name, announce, and toggles private flag', async () => {
    const { stdout } = await run([
      'edit',
      'multi.torrent',
      '-n',
      'renamed-multi',
      '-a',
      'http://alt1.com/announce',
      '-p',
      '-y',
    ]);
    assert.ok(stdout.includes('File written to'));
    const nameRes = await run(['get', 'name', 'multi.torrent']);
    assert.equal(nameRes.stdout.trim(), 'renamed-multi');
  });

  it('aborts edit when output exists and user says no', async () => {
    const { stdout } = await run(['edit', torrentFile, '-o', torrentFile], {
      input: 'no\n',
    });
    assert.ok(stdout.includes('already exists, overwrite it?'));
  });

  it('handles invalid torrent file on get', async () => {
    fs.writeFileSync(
      path.join(__dirname, 'invalid.torrent'),
      'not bencoded data',
    );
    try {
      await run(['get', 'name', 'invalid.torrent']);
      assert.fail('should have failed');
    } catch (err) {
      assert.equal(err.code, 1);
      assert.ok(err.stderr.includes('Error:'));
    }
  });

  it('handles invalid torrent file on edit', async () => {
    try {
      await run(['edit', 'invalid.torrent', '-y']);
      assert.fail('should have failed');
    } catch (err) {
      assert.equal(err.code, 1);
      assert.ok(err.stderr.includes('Error:'));
    }
  });

  it('handles invalid torrent file on hashcheck', async () => {
    try {
      await run(['hashcheck', 'invalid.torrent']);
      assert.fail('should have failed');
    } catch (err) {
      assert.equal(err.code, 1);
      assert.ok(err.stderr.includes('Error:'));
    }
  });
});
