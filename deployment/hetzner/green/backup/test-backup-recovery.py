"""Exercise unchanged production recovery functions with synthetic Docker/systemd ports."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
SHELL = os.environ.get("BACKUP_TEST_BASH", "bash")
SOURCE = (HERE.parent / "coordinated-backup.sh").read_text()
FUNCTIONS = "remove_helper() {" + SOURCE.split("remove_helper() {", 1)[1].split("trap cleanup EXIT", 1)[0]


class BackupRecoveryTests(unittest.TestCase):
    def run_case(self, scenario):
        with tempfile.TemporaryDirectory(prefix="phaeno-backup-recovery-fixture-") as temporary:
            root = Path(temporary).resolve()
            self.assertTrue(root.is_relative_to(Path(tempfile.gettempdir()).resolve()))
            trace = root / "trace"
            trace_path = trace.as_posix()
            if os.name == "nt":
                trace_path = "/" + trace_path[0].lower() + trace_path[2:]
            environment = os.environ.copy()
            environment.update(TRACE=trace_path, SCENARIO=scenario)
            code = r'''
set -Eeuo pipefail
phase=synthetic_failure
api_name=phaeno-portal-green-api
api_id=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
helper_id=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
helper_name=synthetic-helper
token=11111111-2222-3333-4444-555555555555
api_stopped=true
work=""
watchdog=synthetic-watchdog
timeout() { while [[ "$1" == --* || "$1" =~ ^[0-9]+s$ ]]; do shift; done; "$@"; }
sleep() { :; }
systemctl() { printf 'watchdog_cancelled\n' >> "$TRACE"; }
docker() {
    case "$1" in
        inspect)
            case "$*" in
                *State.Health.Status*)
                    if [[ "$SCENARIO" == unhealthy ]]; then echo unhealthy; else echo healthy; fi ;;
                *coordinated-backup-owner*)
                    if [[ "$SCENARIO" == foreign_helper ]]; then echo "$helper_id different-owner"; else echo "$helper_id $token"; fi ;;
                *)
                    if [[ "$SCENARIO" == changed_api ]]; then echo changed-id; else echo "$api_id"; fi ;;
            esac ;;
        start) printf 'api_started\n' >> "$TRACE" ;;
        rm) printf 'owned_helper_removed\n' >> "$TRACE" ;;
        *) exit 90 ;;
    esac
}
''' + FUNCTIONS + r'''
trap cleanup EXIT
trap 'exit 143' TERM
if [[ "$SCENARIO" == already_resumed ]]; then api_stopped=false; fi
if [[ "$SCENARIO" == interrupted ]]; then kill -TERM $$; fi
exit 7
'''
            result = subprocess.run([SHELL, "-c", code], capture_output=True, text=True,
                                    timeout=20, env=environment)
            events = trace.read_text().splitlines() if trace.exists() else []
            return result, events

    def test_failed_snapshot_resumes_exact_api_and_cleans_owned_helper(self):
        result, events = self.run_case("snapshot_failure")
        self.assertEqual(result.returncode, 7)
        self.assertEqual(events, ["api_started", "watchdog_cancelled", "owned_helper_removed"])

    def test_failed_restore_after_resume_does_not_restart_api_again(self):
        result, events = self.run_case("already_resumed")
        self.assertEqual(result.returncode, 7)
        self.assertEqual(events, ["owned_helper_removed"])

    def test_changed_api_identity_is_never_started(self):
        result, events = self.run_case("changed_api")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("api_started", events)
        self.assertNotIn("watchdog_cancelled", events)
        self.assertIn("watchdog_retained=true", result.stderr)

    def test_unhealthy_restart_preserves_watchdog_and_fails(self):
        result, events = self.run_case("unhealthy")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("api_started", events)
        self.assertNotIn("watchdog_cancelled", events)

    def test_foreign_helper_is_not_removed(self):
        result, events = self.run_case("foreign_helper")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("owned_helper_removed", events)

    def test_interruption_resumes_api_before_returning_failure(self):
        result, events = self.run_case("interrupted")
        self.assertEqual(result.returncode, 143)
        self.assertEqual(events, ["api_started", "watchdog_cancelled", "owned_helper_removed"])


if __name__ == "__main__":
    unittest.main()
