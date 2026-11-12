"""Offline regression tests. GenVM consensus is verified separately in Studio."""
import importlib.util
import json
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1]
stub = ModuleType("genlayer")
class UserError(Exception):
    pass
class Return:
    def __init__(self, value):
        self.calldata = value

stub.TreeMap = dict
stub.gl = SimpleNamespace(
    Contract=object,
    vm=SimpleNamespace(UserError=UserError, Return=Return),
    public=SimpleNamespace(write=lambda f: f, view=lambda f: f),
    message=SimpleNamespace(sender_address="0x" + "ab" * 20),
    nondet=SimpleNamespace(web=SimpleNamespace()),
)
sys.modules["genlayer"] = stub
spec = importlib.util.spec_from_file_location("data_drift", ROOT / "contracts/data_drift.py")
drift = importlib.util.module_from_spec(spec)
spec.loader.exec_module(drift)

class DataDriftTests(unittest.TestCase):
    def setUp(self):
        self.contract = drift.DataDrift()
        self.contract.policies = {}
        self.contract.comparisons = {}
        self.policy = stub.gl.message.sender_address + "/merchant_settlements/strict"
        self.contract.register_policy("merchant_settlements", "strict", ",".join(drift.RULES))
        self.urls = ["https://raw.githubusercontent.com/acme/data/" + "a"*40 + "/v" + str(i) + ".json" for i in (1,2,3)]
        self.bodies = {url: (ROOT / f"evidence/v{i}.json").read_bytes() for i,url in enumerate(self.urls,1)}
        stub.gl.nondet.web.get = lambda url: SimpleNamespace(body=self.bodies[url])
        def consensus(leader, validator):
            result = leader()
            self.assertTrue(validator(Return(result)))
            self.assertFalse(validator(Return("fabricated")))
            self.assertFalse(validator(None))
            return result
        stub.gl.vm.run_nondet_unsafe = consensus

    def open(self, start=1, end=2, new_hash=None):
        old, new = self.urls[start-1], self.urls[end-1]
        self.contract.open_comparison(self.policy, f"v{start}", f"v{end}", old, drift.digest(self.bodies[old]),
                                      new, new_hash or drift.digest(self.bodies[new]), "", "")
        return next(reversed(self.contract.comparisons))

    def test_immutable_policy(self):
        with self.assertRaisesRegex(UserError, "already registered"):
            self.contract.register_policy("merchant_settlements", "strict", "UNIT_CHANGED")

    def test_dollars_to_cents(self):
        case = self.open()
        self.contract.assess(case)
        record = json.loads(self.contract.get_comparison(case))
        self.assertEqual(record["decision"], {
            "outcome":"BREAKING", "findings":[["amount","UNIT_CHANGED","unit","USD","USD_cent"]]
        })
        self.assertEqual(record["decision_hash"], drift.digest((case + ":" + drift.encode(record["decision"])).encode()))
        with self.assertRaisesRegex(UserError, "already assessed"):
            self.contract.assess(case)

    def test_additive_change(self):
        case = self.open(2, 3)
        self.contract.assess(case)
        self.assertEqual(json.loads(self.contract.get_comparison(case))["decision"]["outcome"], "COMPATIBLE")

    def test_bad_hash_preserves_open_case(self):
        case = self.open(new_hash="f"*64)
        with self.assertRaisesRegex(UserError, "Review unavailable"):
            self.contract.assess(case)
        self.assertEqual(json.loads(self.contract.get_comparison(case))["status"], "OPEN")

    def test_duplicate_case_rejected(self):
        self.open()
        with self.assertRaisesRegex(UserError, "already exists"):
            self.open()

    def test_semantic_change_and_uncertainty(self):
        old = drift.dictionary(self.bodies[self.urls[0]])
        new = drift.dictionary(self.bodies[self.urls[1]])
        new["fields"]["amount"]["description"] = "Net settlement after fees."
        for verdict, outcome in [("CHANGED", "BREAKING"), ("UNKNOWN", "INCONCLUSIVE"), ("SAME", "COMPATIBLE")]:
            with self.subTest(verdict=verdict):
                found = drift.compare(old, new, ["MEANING_CHANGED"], lambda *args: verdict)
                self.assertEqual(found["outcome"], outcome)
                if found["findings"]:
                    self.assertEqual(found["findings"][0][-1], "Net settlement after fees.")

    def test_structural_changes(self):
        old = drift.dictionary(self.bodies[self.urls[0]])
        new = drift.dictionary(self.bodies[self.urls[1]])
        del new["fields"]["settlement_id"]
        new["fields"]["amount"].update(type="decimal", nullable=True)
        findings = drift.compare(old, new, drift.RULES, lambda *args: "SAME")["findings"]
        self.assertEqual([row[1] for row in findings], ["TYPE_CHANGED", "UNIT_CHANGED", "NULLABILITY_WIDENED", "REMOVED"])

    def test_rejects_duplicate_keys_and_non_pinned_url(self):
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            drift.dictionary(b'{"dataset":"fake","dataset":"settlements"}')
        with self.assertRaisesRegex(UserError, "commit URL"):
            drift.source("https://raw.githubusercontent.com/acme/data/main/v1.json", "a"*64)

if __name__ == "__main__":
    unittest.main()
