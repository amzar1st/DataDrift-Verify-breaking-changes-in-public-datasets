# Live verification

Studionet chain **61999**. Deployment and writes were signed in GenLayer Studio with built-in test accounts, using Normal (Full Consensus).

- [Public DataDrift dashboard](https://datadrift.tinymule33.chatgpt.site/)
- [Deployed contract](https://explorer-studio.genlayer.com/address/0xEd72555fe8fB9459ca57651c1338CEEBf267857c)
- [Source-matched commit](https://github.com/amzar1st/DataDrift-Verify-breaking-changes-in-public-datasets/blob/caa7beea55573fcbb5dbe2fb27d9f4ce9f3b0a0d/contracts/data_drift.py)
- Git blob for deployed source: `4fabebcda06b23d24c802ec9f2278dfb35342513`

| Step | Receipt | Observed result |
|---|---|---|
| Deploy corrected contract | [Deploy](https://explorer-studio.genlayer.com/tx/0x26e33917999e6e4e3440f7a15a143648df4276bfc4a0387d9424fc6818f9008e) | Finalized, success |
| Register `strict-v1` | [Register policy](https://explorer-studio.genlayer.com/tx/0x4762a4131083eec09a5af4e3732145f1d37449b5123c9955fc59df23ddac6f71) | Finalized, success |
| Pin the v1 and v2 dictionaries and release notes | [Open comparison](https://explorer-studio.genlayer.com/tx/0x05a85637e4e5e9702d9c2ec7b501cb9fb0332255a637f9a47dccd0cd28d2949f) | Finalized, success |
| Assess dollars to cents | [Assess](https://explorer-studio.genlayer.com/tx/0x82a0634b4c6241358c539111f10ac28c0acf2575f67cea96b28bd44edc88ca38) | Finalized, `BREAKING` with `amount / UNIT_CHANGED / USD → USD_cent` |
| Repeat the assessment for the same ID | [Duplicate assessment](https://explorer-studio.genlayer.com/tx/0xaa0e582087699e519dacee3799e08edc119ceebd41cf595fa2255290b6ec2041) | Finalized with execution rollback. Original finding remains readable. |

## Reproduce the result

1. Select **Load example** on the dashboard, or read `get_comparison` from finalized state with ID `2cfe524431f18a7d4087b08d406fe27961a25af127f0f9ff9bddb8db5bd7da7b`.
2. Confirm the amount type stays integer in both linked dictionaries. The finding cites the unit change. The finalized decision digest is `337c92503e409173d26a08a6ba6f05d9011fa813265ea3cf298277c89ebbdf1b`.
3. Track the successful assessment and the duplicate assessment in the browser. The dashboard shows a finalized success and a finalized execution failure respectively.
4. To write from a fresh Studio session, import the existing address from the Contracts panel by selecting the file-down icon, then use Run and Debug. The dashboard generates method arguments. For a comparison it also calculates the expected case ID from the Studio signing address and the supplied pins.

## Verification scope

The frontend build, eight Python regression tests, and three JavaScript lifecycle tests passed. Public browser checks covered the default finalized case, preparation of Studio arguments, and the successful and rolled-back receipts. Signing takes place in Studio. The earlier prototype exposed an HTTP-response attribute mismatch in GenVM. The contract listed above is the corrected deployment.

## Semantic-only change

A second Studio account opened a comparison from v2 to v4. The field name, integer type, and unit were unchanged. Its published description changed from “Gross settlement amount.” to “Net settlement amount after fees are deducted.” The browser generated the expected case ID before the Studio write and read it back from finalized state afterward.

- Case ID `a6fb3af10aa8dfe2973f4684d189edc64a98628b81ac711e8906ac878729a213`
- [Finalized comparison creation](https://explorer-studio.genlayer.com/tx/0x7d92bf26cbad611f4931d3c20e651b2acffc2fe639abd5a156c97ef5ce397206)
- [Finalized assessment](https://explorer-studio.genlayer.com/tx/0x62e7dbd4f7dfcc80080d22b276a175443ca52ef305fcbf8c764d055c1a706e1b)
- Result `BREAKING` with `amount / MEANING_CHANGED` and decision digest `392775667874bbfef641e66aad1e20c3ba89e48bd0a4a32c3373b3956f6b3425`

The explorer's displayed contract source and the repository source match byte-for-byte by SHA-256 `5dfdfe9b812dd97c06a306ce27ee91dffb6a3ce5b9294af56726798f0f09cec4`.
