import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("gate", Path(__file__).with_name("verify-ui-quality.py"))
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class ReleaseGateTests(unittest.TestCase):
    def test_wrong_source_or_workflow_cannot_qualify(self):
        self.assertIsNone(gate.accepted_run([{"head_sha": "b" * 40, "path": ".github/workflows/ui-quality.yml", "status": "completed", "conclusion": "success"}], "a" * 40))
        self.assertIsNone(gate.accepted_run([{"head_sha": "a" * 40, "path": ".github/workflows/deploy.yml", "status": "completed", "conclusion": "success"}], "a" * 40))

    def test_a_later_failure_or_unfinished_attempt_blocks_an_older_success(self):
        run = {"head_sha": "a" * 40, "path": ".github/workflows/ui-quality.yml", "id": 1, "status": "completed", "conclusion": "success"}
        self.assertIsNone(gate.accepted_run([run, dict(run, id=2, conclusion="failure")], "a" * 40))
        self.assertIsNone(gate.accepted_run([run, dict(run, run_attempt=2, status="in_progress")], "a" * 40))

    def test_every_job_must_complete_successfully(self):
        jobs = [{"name": name, "status": "completed", "conclusion": "success"} for name in gate.REQUIRED_JOBS]
        self.assertTrue(gate.accepted_jobs(jobs))
        self.assertFalse(gate.accepted_jobs(jobs[:-1]))
        self.assertFalse(gate.accepted_jobs([dict(jobs[0], conclusion="skipped"), *jobs[1:]]))
        self.assertFalse(gate.accepted_jobs([dict(jobs[0], conclusion="cancelled"), *jobs[1:]]))


if __name__ == "__main__":
    unittest.main()
