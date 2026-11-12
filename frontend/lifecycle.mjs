export function describeReceipt(receipt) {
  if (!receipt) return { label: 'Waiting for the transaction to appear', stop: false };
  const states = ['UNINITIALIZED','PENDING','PROPOSING','COMMITTING','REVEALING','ACCEPTED','UNDETERMINED','FINALIZED','CANCELED','APPEAL_REVEALING','APPEAL_COMMITTING','READY_TO_FINALIZE','VALIDATORS_TIMEOUT','LEADER_TIMEOUT'];
  const status = receipt.statusName ?? receipt.status_name ?? states[receipt.status] ?? receipt.status;
  const leaders = receipt.consensus_data?.leader_receipt ?? [];
  const leader = Array.isArray(leaders) ? leaders.at(-1) : leaders;
  const execution = receipt.txExecutionResultName ?? receipt.execution_result ?? leader?.result?.status;
  const success = /^(SUCCESS|FINISHED_WITH_RETURN|RETURN)$/i.test(execution ?? '');
  const error = !!execution && !success && !/^(NOT_YET_EXECUTED|NONE)$/i.test(execution);
  if (status === 'FINALIZED') {
    return { label: success ? 'Finalized · execution succeeded' : error ? 'Finalized · execution failed (' + execution + ')' : 'Finalized · check receipt for execution result', stop: true, error };
  }
  if (status === 'CANCELED') return { label: 'Canceled', stop: true, error: true };
  if (status === 'ACCEPTED') return { label: 'Accepted · awaiting finalization' + (error ? ' · execution failed' : ''), stop: false, error };
  return { label: String(status ?? 'Pending').replaceAll('_', ' '), stop: false, error: ['UNDETERMINED','VALIDATORS_TIMEOUT','LEADER_TIMEOUT'].includes(status) };
}
