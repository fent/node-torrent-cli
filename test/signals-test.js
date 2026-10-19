const assert = require('node:assert');
const sinon = require('sinon');
const fs = require('node:fs');
const EventEmitter = require('node:events');
const nt = require('nt');
const make = require('../bin/nt-make');
const hashcheck = require('../bin/nt-hashcheck');
const edit = require('../bin/nt-edit');

describe('signals and handler edge cases', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('nt-make', () => {
    it('handles SIGTSTP and SIGINT', async () => {
      const mockHasher = new EventEmitter();
      mockHasher.toggle = sandbox.spy();
      sandbox.stub(nt, 'makeWrite').returns(mockHasher);
      sandbox.stub(nt, 'read');
      const exitStub = sandbox.stub(process, 'exit');
      sandbox.stub(process.stdout, 'write');

      const initialSigintListeners = process.listeners('SIGINT');
      const initialSigtstpListeners = process.listeners('SIGTSTP');

      const tmpFile = 'test-sig.torrent.tmp';
      fs.writeFileSync(tmpFile, 'tmp content');

      await make.handler({
        file: 'test-sig',
        files: [],
        announceList: ['http://a.com', 'http://b.com'],
        yes: true,
        dir: '.',
      });

      const newSigint = process
        .listeners('SIGINT')
        .filter((l) => !initialSigintListeners.includes(l));
      const newSigtstp = process
        .listeners('SIGTSTP')
        .filter((l) => !initialSigtstpListeners.includes(l));

      assert.equal(newSigint.length, 1);
      assert.equal(newSigtstp.length, 1);

      newSigtstp[0]();
      assert.ok(mockHasher.toggle.calledOnce);

      newSigint[0]();
      await new Promise((r) => setTimeout(r, 50));
      assert.ok(exitStub.calledWith(1));
      assert.ok(!fs.existsSync(tmpFile));
      for (const l of newSigint) process.removeListener('SIGINT', l);
      for (const l of newSigtstp) process.removeListener('SIGTSTP', l);
    });

    it('handles SIGINT when unlink errors', async () => {
      const mockHasher = new EventEmitter();
      mockHasher.toggle = sandbox.spy();
      sandbox.stub(nt, 'makeWrite').returns(mockHasher);
      sandbox.stub(nt, 'read');
      const exitStub = sandbox.stub(process, 'exit');
      sandbox.stub(process.stdout, 'write');
      sandbox
        .stub(fs, 'unlink')
        .callsFake((_p, cb) => cb(new Error('unlink err')));

      const initialSigintListeners = process.listeners('SIGINT');
      const initialSigtstpListeners = process.listeners('SIGTSTP');

      await make.handler({
        file: 'test-err',
        files: [],
        announceList: ['http://a.com'],
        yes: true,
        dir: '.',
      });

      const newSigint = process
        .listeners('SIGINT')
        .filter((l) => !initialSigintListeners.includes(l));
      const newSigtstp = process
        .listeners('SIGTSTP')
        .filter((l) => !initialSigtstpListeners.includes(l));

      newSigint[0]();
      await new Promise((r) => setTimeout(r, 50));
      assert.ok(exitStub.calledWith(1));

      for (const l of newSigint) process.removeListener('SIGINT', l);
      for (const l of newSigtstp) process.removeListener('SIGTSTP', l);
    });

    it('handles nt.read error and hasher end rename error', async () => {
      const mockHasher = new EventEmitter();
      const mockTorrent = { infoHash: () => 'hash123' };
      sandbox.stub(nt, 'makeWrite').returns(mockHasher);
      sandbox.stub(nt, 'read').callsFake((_hasher, cb) => {
        cb(new Error('read err'), mockTorrent);
      });
      sandbox.stub(fs, 'rename').callsFake((_src, _dest, cb) => {
        cb(new Error('rename err'));
      });
      sandbox.stub(process, 'exit');
      sandbox.stub(process.stderr, 'write');

      const initialSigintListeners = process.listeners('SIGINT');
      const initialSigtstpListeners = process.listeners('SIGTSTP');

      await make.handler({
        file: 'test-rename-err',
        files: [],
        announceList: ['http://a.com'],
        yes: true,
        dir: '.',
      });

      mockHasher.emit('end');
      await new Promise((r) => setTimeout(r, 50));

      const newSigint = process
        .listeners('SIGINT')
        .filter((l) => !initialSigintListeners.includes(l));
      const newSigtstp = process
        .listeners('SIGTSTP')
        .filter((l) => !initialSigtstpListeners.includes(l));
      for (const l of newSigint) process.removeListener('SIGINT', l);
      for (const l of newSigtstp) process.removeListener('SIGTSTP', l);
    });

    it('returns null announce when announceList is not provided', async () => {
      const mockHasher = new EventEmitter();
      sandbox.stub(nt, 'makeWrite').returns(mockHasher);
      sandbox.stub(nt, 'read');
      sandbox.stub(process, 'exit');

      const initialSigintListeners = process.listeners('SIGINT');
      const initialSigtstpListeners = process.listeners('SIGTSTP');

      await make.handler({
        file: 'test-no-announce',
        files: [],
        yes: true,
        dir: '.',
      });

      mockHasher.emit('end');
      await new Promise((r) => setTimeout(r, 50));

      const newSigint = process
        .listeners('SIGINT')
        .filter((l) => !initialSigintListeners.includes(l));
      const newSigtstp = process
        .listeners('SIGTSTP')
        .filter((l) => !initialSigtstpListeners.includes(l));
      for (const l of newSigint) process.removeListener('SIGINT', l);
      for (const l of newSigtstp) process.removeListener('SIGTSTP', l);
    });

    it('executes interval callback with fake timers', async () => {
      const clock = sandbox.useFakeTimers();
      const mockHasher = new EventEmitter();
      sandbox.stub(nt, 'makeWrite').returns(mockHasher);
      sandbox.stub(nt, 'read');
      sandbox.stub(process, 'exit');

      const p = make.handler({
        file: 'fake-timer',
        files: [],
        yes: true,
        dir: '.',
      });
      clock.tick(500000);
      mockHasher.emit('end');
      clock.restore();
      await p;
    });
  });

  describe('nt-hashcheck', () => {
    it('handles SIGTSTP and SIGINT', () => {
      const mockHasher = new EventEmitter();
      mockHasher.toggle = sandbox.spy();
      const mockTorrent = {
        hashCheck: sandbox.stub().returns(mockHasher),
      };
      sandbox.stub(nt, 'read').callsFake((_file, cb) => {
        cb(null, mockTorrent);
      });
      const exitStub = sandbox.stub(process, 'exit');
      sandbox.stub(process.stdout, 'write');

      const initialSigintListeners = process.listeners('SIGINT');
      const initialSigtstpListeners = process.listeners('SIGTSTP');

      hashcheck.handler({
        torrent: 'test.torrent',
        dir: '.',
      });

      mockHasher.emit('progress', 50, 1000, 1000);
      mockHasher.emit('matcherror');
      mockHasher.emit('match', 0, 'hash', 50);

      const newSigint = process
        .listeners('SIGINT')
        .filter((l) => !initialSigintListeners.includes(l));
      const newSigtstp = process
        .listeners('SIGTSTP')
        .filter((l) => !initialSigtstpListeners.includes(l));

      assert.equal(newSigint.length, 1);
      assert.equal(newSigtstp.length, 1);

      newSigtstp[0]();
      assert.ok(mockHasher.toggle.calledOnce);

      newSigint[0]();
      assert.ok(exitStub.calledWith(1));

      for (const l of newSigint) process.removeListener('SIGINT', l);
      for (const l of newSigtstp) process.removeListener('SIGTSTP', l);
    });

    it('executes interval callback with fake timers', () => {
      const clock = sandbox.useFakeTimers();
      const mockHasher = new EventEmitter();
      const mockTorrent = {
        hashCheck: sandbox.stub().returns(mockHasher),
      };
      sandbox.stub(nt, 'read').callsFake((_file, cb) => {
        cb(null, mockTorrent);
      });
      hashcheck.handler({ torrent: 'test.torrent', dir: '.' });
      clock.tick(500000);
      mockHasher.emit('end');
      clock.restore();
    });
  });

  describe('nt-edit', () => {
    it('handles ws error and rename error', async () => {
      const mockWs = new EventEmitter();
      const mockTorrent = {
        metadata: {
          announce: 'http://a.com',
          info: {
            name: 'pkg',
            files: [{ path: 'pkg', length: 100 }],
            private: 1,
          },
        },
        createWriteStream: sandbox.stub().returns(mockWs),
      };
      sandbox.stub(nt, 'read').callsFake((_file, cb) => {
        cb(null, mockTorrent);
      });
      sandbox.stub(fs, 'rename').callsFake((_src, _dest, cb) => {
        cb(new Error('rename err'));
      });
      sandbox.stub(process, 'exit');
      sandbox.stub(process.stderr, 'write');

      await edit.handler({
        torrent: 'test.torrent',
        output: 'test-no-ext',
        name: 'new-name',
        private: true,
        moreInfo: { name: 'ignored-name', custom: 'added' },
        yes: true,
      });

      mockWs.emit('close');
      mockWs.emit('error', new Error('stream err'));
    });
  });
});
