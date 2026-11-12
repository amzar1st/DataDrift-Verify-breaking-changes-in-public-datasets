import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionHashVariant } from 'genlayer-js/types';
import { address, demo, explorer } from './config.mjs';
import { describeReceipt } from './lifecycle.mjs';

const client = createClient({ chain: studionet });
const $ = id => document.getElementById(id);
const methodFields = {
  register_policy: ['dataset', 'revision', 'rules'],
  open_comparison: ['policy_id','from_version','to_version','old_url','old_sha','new_url','new_sha','notes_url','notes_sha'],
  assess: ['case_id'],
};
const findingLabels = {
  REMOVED: 'Field removed', TYPE_CHANGED: 'Type changed', UNIT_CHANGED: 'Unit changed',
  NULLABILITY_WIDENED: 'Now nullable', MEANING_CHANGED: 'Meaning changed', MEANING_UNCLEAR: 'Meaning unclear',
};
const sourceUrl = /^https:\/\/raw\.githubusercontent\.com\/[\w.-]+\/[\w.-]+\/[0-9a-f]{40}\/[\w./-]+$/;
const hash = /^[0-9a-f]{64}$/;
const identifier = /^[a-zA-Z_][\w.-]{0,63}$/;
const account = /^0x[0-9a-f]{40}$/i;
const rules = ['REMOVED','TYPE_CHANGED','UNIT_CHANGED','NULLABILITY_WIDENED','MEANING_CHANGED'];
let currentLookup = 0;
let currentTrack = 0;
$('contract-link').href = explorer + '/address/' + address;

function status(id, message, error = false) {
  $(id).textContent = message;
  $(id).dataset.error = String(error);
}

function link(node, url) {
  node.href = url;
  node.target = '_blank';
  node.rel = 'noreferrer';
  node.hidden = false;
}

async function read(functionName, ...args) {
  return client.readContract({ address, functionName, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
}

function render(record, policy) {
  $('dataset').textContent = record.dataset;
  $('versions').textContent = record.from_version + ' → ' + record.to_version;
  const outcome = record.decision?.outcome ?? 'OPEN';
  $('outcome').textContent = outcome;
  $('outcome').dataset.outcome = outcome;
  $('findings').replaceChildren();
  const rows = record.decision?.findings ?? [];
  for (const [field, finding, , before, after] of rows) {
    const row = $('findings').insertRow();
    for (const value of [field, findingLabels[finding] ?? finding, before, after]) {
      row.insertCell().textContent = value === null ? '—' : String(value);
    }
  }
  if (!rows.length) {
    const cell = $('findings').insertRow().insertCell();
    cell.colSpan = 4;
    cell.textContent = record.decision ? 'No policy violations found.' : 'This comparison is awaiting assessment.';
  }
  $('evidence').replaceChildren();
  for (const [key, label] of [['baseline','Baseline dictionary'],['candidate','Candidate dictionary'],['notes','Release notes']]) {
    const ref = record[key];
    if (!ref || !sourceUrl.test(ref.url) || !hash.test(ref.sha256)) continue;
    const a = document.createElement('a');
    a.textContent = label + ' ↗';
    a.title = 'SHA-256 ' + ref.sha256;
    link(a, ref.url);
    $('evidence').append(a);
  }
  $('policy-info').textContent = 'Locked policy ' + policy.revision + ' · ' + policy.rules.map(rule => findingLabels[rule] ?? rule).join(', ');
  $('decision-hash').textContent = record.decision_hash ? 'Decision SHA-256 ' + record.decision_hash : '';
  $('example-tx').hidden = true;
  if (record.id === demo.id && demo.transaction) link($('example-tx'), explorer + '/tx/' + demo.transaction);
  $('result').hidden = false;
}

async function loadCase(id) {
  const sequence = ++currentLookup;
  status('case-status', 'Reading finalized Studionet state…');
  $('result').hidden = true;
  try {
    const record = JSON.parse(await read('get_comparison', id));
    const policy = JSON.parse(await read('get_policy', record.policy_id));
    if (sequence !== currentLookup) return;
    render(record, policy);
    status('case-status', id === demo.id ? 'Synthetic publisher example · finalized Studionet state' : 'Finalized Studionet state');
  } catch {
    if (sequence === currentLookup) status('case-status', 'Could not read this comparison. Check the ID and whether its creation has finalized, then retry.', true);
  }
}
$('lookup').addEventListener('submit', event => {
  event.preventDefault();
  void loadCase($('case-id').value.trim());
});
$('demo').addEventListener('click', () => {
  $('case-id').value = demo.id;
  void loadCase(demo.id);
});

function showFields() {
  const fields = $('fields');
  fields.replaceChildren();
  const method = $('method').value;
  const names = method === 'open_comparison' ? ['studio_account', ...methodFields[method]] : methodFields[method];
  for (const name of names) {
    const label = document.createElement('label');
    label.htmlFor = 'arg-' + name;
    label.textContent = name === 'studio_account' ? 'Signing address shown in Studio' : name + (name.startsWith('notes_') ? ' (optional)' : '');
    const input = document.createElement('input');
    input.name = name;
    input.id = label.htmlFor;
    input.required = !name.startsWith('notes_');
    input.maxLength = name.endsWith('_url') ? 400 : name === 'policy_id' ? 172 : name === 'rules' ? 100 : 64;
    if (name.endsWith('_sha') || name === 'case_id') input.pattern = '[0-9a-f]{64}';
    if (name === 'rules') input.value = rules.join(',');
    fields.append(label, input);
  }
  $('arguments').hidden = true;
  $('copy').hidden = true;
  status('draft-status', '');
}
$('method').addEventListener('change', showFields);
showFields();

function validateDraft(method, args) {
  if (method === 'register_policy') {
    const selected = args.rules.split(',');
    return identifier.test(args.dataset) && identifier.test(args.revision) &&
      new Set(selected).size === selected.length && selected.every(rule => rules.includes(rule));
  }
  if (method === 'assess') return hash.test(args.case_id);
  const [owner, dataset, revision, extra] = args.policy_id.split('/');
  return extra === undefined && account.test(args.studio_account) && account.test(owner) && identifier.test(dataset) && identifier.test(revision) &&
    identifier.test(args.from_version) && identifier.test(args.to_version) && args.from_version !== args.to_version &&
    sourceUrl.test(args.old_url) && sourceUrl.test(args.new_url) && hash.test(args.old_sha) &&
    hash.test(args.new_sha) && args.old_sha !== args.new_sha &&
    ((!args.notes_url && !args.notes_sha) || (sourceUrl.test(args.notes_url) && hash.test(args.notes_sha)));
}

async function caseIdFor(args, signer) {
  const record = {
    baseline: { sha256: args.old_sha, url: args.old_url },
    candidate: { sha256: args.new_sha, url: args.new_url },
    dataset: args.policy_id.split('/')[1],
    from_version: args.from_version,
    ...(args.notes_url ? { notes: { sha256: args.notes_sha, url: args.notes_url } } : {}),
    policy_id: args.policy_id,
    submitter: signer.toLowerCase(),
    to_version: args.to_version,
  };
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(record)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

$('draft').addEventListener('submit', async event => {
  event.preventDefault();
  const args = Object.fromEntries([...new FormData(event.currentTarget)].map(([name, value]) => [name, value.trim()]));
  const method = $('method').value;
  $('arguments').hidden = true;
  $('copy').hidden = true;
  if (!validateDraft(method, args)) {
    status('draft-status', 'Check the identifiers, selected rules, and commit-pinned URL/hash pairs.', true);
    return;
  }
  const signer = args.studio_account;
  delete args.studio_account;
  if (method === 'open_comparison') args.policy_id = args.policy_id.split('/').map((part, index) => index === 0 ? part.toLowerCase() : part).join('/');
  const payload = { address, method, args };
  if (signer) payload.expectedComparisonId = await caseIdFor(args, signer);
  if ($('method').value !== method) return;
  $('arguments').textContent = JSON.stringify(payload, null, 2);
  $('arguments').hidden = false;
  $('copy').hidden = false;
  status('draft-status', 'Arguments ready for Studio.');
});
$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('arguments').textContent);
    status('draft-status', 'Arguments copied.');
  } catch {
    status('draft-status', 'Clipboard access is unavailable. Select the arguments above to copy them.', true);
  }
});

$('tracker').addEventListener('submit', async event => {
  event.preventDefault();
  const sequence = ++currentTrack;
  const tx = $('tx-hash').value.trim();
  link($('tx-link'), explorer + '/tx/' + tx);
  status('tx-status', 'Fetching transaction receipt…');
  for (let attempt = 0; attempt < 32 && sequence === currentTrack; attempt++) {
    try {
      const receipt = await client.getTransaction({ hash: tx });
      if (sequence !== currentTrack) return;
      const recipient = receipt?.to_address ?? receipt?.recipient;
      if (recipient && recipient.toLowerCase() !== address.toLowerCase()) {
        status('tx-status', 'This transaction belongs to another contract.', true);
        return;
      }
      const state = describeReceipt(receipt);
      status('tx-status', state.label, state.error);
      if (state.stop) return;
    } catch {
      if (sequence !== currentTrack) return;
      status('tx-status', 'Receipt unavailable. Retrying…');
    }
    await new Promise(resolve => setTimeout(resolve, 4000));
  }
  if (sequence === currentTrack) status('tx-status', 'Tracking paused. Submit the same hash to resume.');
});
