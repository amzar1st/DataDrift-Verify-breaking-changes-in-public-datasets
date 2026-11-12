import test from 'node:test';
import assert from 'node:assert/strict';
import { describeReceipt } from '../frontend/lifecycle.mjs';

test('pending and accepted receipts keep polling', () => {
  assert.equal(describeReceipt(null).stop, false);
  assert.equal(describeReceipt({status: 'PENDING'}).stop, false);
  assert.match(describeReceipt({status: 5}).label, /awaiting finalization/);
});

test('finalized success, failed execution and absent execution are distinct', () => {
  assert.equal(describeReceipt({status: 'FINALIZED', txExecutionResultName: 'SUCCESS'}).label, 'Finalized · execution succeeded');
  assert.equal(describeReceipt({status: 'FINALIZED', txExecutionResultName: 'FAILURE'}).error, true);
  assert.match(describeReceipt({status: 'FINALIZED'}).label, /check receipt/);
});

test('appeal can follow an undetermined decision, cancellation stops polling', () => {
  assert.equal(describeReceipt({status: 'UNDETERMINED'}).stop, false);
  assert.equal(describeReceipt({status: 'CANCELED'}).stop, true);
});
