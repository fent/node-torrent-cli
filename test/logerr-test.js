const assert = require('assert');
const sinon = require('sinon');
const logerr = require('../bin/logerr');

describe('logerr', () => {
  it('logs Error object and exits with 1', () => {
    const exitStub = sinon.stub(process, 'exit');
    const stderrStub = sinon.stub(process.stderr, 'write');
    logerr(new Error('test error'));
    assert.ok(exitStub.calledWith(1));
    assert.ok(stderrStub.called);
    exitStub.restore();
    stderrStub.restore();
  });

  it('logs string error and exits with 1', () => {
    const exitStub = sinon.stub(process, 'exit');
    const stderrStub = sinon.stub(process.stderr, 'write');
    logerr('string error');
    assert.ok(exitStub.calledWith(1));
    assert.ok(stderrStub.called);
    exitStub.restore();
    stderrStub.restore();
  });
});
