# DataDrift

DataDrift checks whether a new public dataset version breaks a locked compatibility policy. A field can preserve its name and type while changing its unit or meaning. That can silently invalidate dashboards, billing exports, and downstream data pipelines.

[Public dashboard](https://datadrift.tinymule33.chatgpt.site/) · [Studionet contract](https://explorer-studio.genlayer.com/address/0xEd72555fe8fB9459ca57651c1338CEEBf267857c) · [Live verification](docs/LIVE_VERIFICATION.md) · [Project Explorer copy](docs/PROJECT_EXPLORER.md)

## Workflow

1. A team registers an immutable revision under its Studio account address. It selects which changes are breaking.
2. A submitter opens a comparison against that revision with two commit-pinned JSON data dictionaries and SHA-256 digests. A pinned release note can accompany the dictionaries.
3. Any Studio account can request assessment. The leader and validators independently fetch the same URLs, verify their bytes, and derive a canonical finding list. They compare that list and the outcome exactly. The contract records field-level before and after values and a decision digest.
4. The public dashboard reads finalized contract state, shows the evidence, and follows Studio receipts. To write, import the deployed address in Studio using the file-down button in Contracts, choose Run and Debug, enter the prepared arguments, and sign with Studio’s built-in account. Copy the returned hash into the dashboard tracker.

## Compatibility rules and evidence

| Policy rule | Break detected |
|---|---|
| `REMOVED` | A baseline field is absent in the candidate. |
| `TYPE_CHANGED` | A baseline field's declared type changed. |
| `UNIT_CHANGED` | A baseline field's declared unit changed. |
| `NULLABILITY_WIDENED` | A previously non-nullable field can now be null. |
| `MEANING_CHANGED` | Independent model executions agree that changed descriptions explicitly change meaning, scope, or measurement basis. |

An ambiguous description produces an uncertainty row. If there is no other confirmed break, that yields `INCONCLUSIVE`. Added fields are compatible under the supported rules. Release notes, when provided, are fetched and hash-checked as supplementary evidence. The dictionaries drive the assessment. Example dictionaries in [evidence](evidence/) are synthetic publisher fixtures.

Each JSON file has a `dataset` identifier, a `version` identifier, and a `fields` object keyed by field name. Each field declares `type`, `unit`, `nullable` (boolean), and `description`. Use a raw GitHub HTTPS URL with a full 40-character commit and hash the exact bytes with `sha256sum FILE`. The contract supports up to 20 fields, four changed descriptions with semantic review enabled, and 16 KiB per evidence item. Use separate domain-specific comparisons for larger datasets.

The URL and digest identify the exact supplied document. Teams should use the provider's public repository or an independently documented mapping to it. The contract does not attest repository ownership or inspect dataset rows. Evidence fetch, digest, and parse failures prevent a decision from being stored. Retry temporary failures against the same case, or open a new case for corrected immutable evidence. Protocol finalization and appeals are provided by GenLayer.

## Build and test

```sh
npm ci
npm test
npm run build
python -m unittest discover -s tests -v
python -m py_compile contracts/data_drift.py
```

The frontend build outputs `dist/`. Python tests exercise contract rules and state transitions with a local runtime stub. [Live verification](docs/LIVE_VERIFICATION.md) records the separate Studio execution. Network configuration and the default demo live in [frontend/config.mjs](frontend/config.mjs).
