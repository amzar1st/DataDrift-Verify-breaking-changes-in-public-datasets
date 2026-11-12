# GenLayer Project Explorer

| Field | Value |
|---|---|
| Contribution type | Builder → Projects |
| Project name | DataDrift |
| Suggested primary tag | Developer Tools |
| Suggested topics | Data Quality, Oracles |
| One-liner | Verify breaking changes in public datasets against immutable compatibility policies, with finalized field-level findings on GenLayer. |
| Frontend | https://datadrift.tinymule33.chatgpt.site/ |
| GitHub | https://github.com/amzar1st/DataDrift-Verify-breaking-changes-in-public-datasets |
| Contract | https://explorer-studio.genlayer.com/address/0xEd72555fe8fB9459ca57651c1338CEEBf267857c |
| Live verification | https://github.com/amzar1st/DataDrift-Verify-breaking-changes-in-public-datasets/blob/main/docs/LIVE_VERIFICATION.md |
| Demo transaction | https://explorer-studio.genlayer.com/tx/0x82a0634b4c6241358c539111f10ac28c0acf2575f67cea96b28bd44edc88ca38 |

## Description

DataDrift helps data teams spot breaking changes that schema diffs miss. A team locks a compatibility policy, then compares two commit-pinned public data dictionaries with SHA-256 commitments. GenLayer validators independently retrieve the evidence and agree on canonical field-level findings. The contract checks field removal, type changes, unit changes, and nullability, and uses independent semantic evaluation when descriptions change. The public dashboard reads finalized state and shows the exact before and after values, pinned sources, decision hash, and transaction status. The Studionet demo flags an integer amount whose unit changes from dollars to cents. Writes are signed with GenLayer Studio's built-in account.
