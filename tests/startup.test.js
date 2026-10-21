const test = require('node:test');
const assert = require('node:assert/strict');
const createHarness = require('./helpers/server-harness');
test('healthNeverRunsAdb', async () => {
    const h = createHarness();
    const response = await h.request('GET', '/api/health');
    assert.equal(response.body.app, 'brq-transfer');
    assert.equal(h.commands.length, 0);
});
test('shutdownStopsOwnedSessionsAndRejectsNewAdbWork', async () => {
    const h = createHarness();
    await h.eval('shutdown()');
    await assert.rejects(h.eval("runAdbCommand(['devices'])"), /kapanıyor/);
});
