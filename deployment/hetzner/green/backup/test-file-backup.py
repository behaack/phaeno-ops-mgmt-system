"""Bounded synthetic archive checks; stdlib only, no Docker or database required."""
import hashlib
import io
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
SHELL = os.environ.get("BACKUP_TEST_BASH", "bash")


def shell_path(path):
    text = Path(path).resolve().as_posix()
    if os.name == "nt":
        return "/" + text[0].lower() + text[2:]
    return text


class FileBackupTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="phaeno-backup-fixture-")
        self.root = Path(self.temporary.name).resolve()
        self.assertTrue(self.root.is_relative_to(Path(tempfile.gettempdir()).resolve()))
        self.source = self.root / "source"
        self.source.mkdir()
        self.destination = self.root / "restore"
        self.destination.mkdir()
        self.archive = self.root / "files.tar"
        self.manifest = self.root / "files.tsv"
        self.references = self.root / "references.tsv"
        self.rows = []
        for area, content in (("order-files", b"Synthetic order evidence\n"),
                              ("provisioning-files", b"Synthetic curated source\n")):
            path = f"{area}/2026/09/{area}.txt"
            target = self.source / path
            target.parent.mkdir(parents=True)
            target.write_bytes(content)
            self.rows.append((path, hashlib.sha256(content).hexdigest(), str(len(content))))
        self.repack()

    def tearDown(self):
        # TemporaryDirectory owns exactly the verified synthetic temporary root.
        self.temporary.cleanup()

    def repack(self):
        with tarfile.open(self.archive, "w", format=tarfile.GNU_FORMAT) as archive:
            archive.add(self.source, arcname=".")
        self.manifest.write_text("".join("\t".join(row) + "\n" for row in sorted(self.rows)), encoding="ascii", newline="\n")
        self.references.write_text("".join("\t".join(row) + "\trequired\n" for row in sorted(self.rows)), encoding="ascii", newline="\n")

    def verify(self, success):
        result = subprocess.run([SHELL, shell_path(HERE / "file-tree.sh"), "verify",
                                 shell_path(self.archive), shell_path(self.manifest),
                                 shell_path(self.references), shell_path(self.destination)],
                                capture_output=True, text=True, timeout=30)
        if success:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("file_restore_check=PASS", result.stdout)
        else:
            self.assertNotEqual(result.returncode, 0)
            self.assertNotIn("file_restore_check=PASS", result.stdout)
        for row in self.rows:
            self.assertNotIn(row[0], result.stdout + result.stderr)
        return result

    def test_populated_archive_restores_both_areas(self):
        self.verify(True)
        for row in self.rows:
            self.assertEqual(hashlib.sha256((self.destination / row[0]).read_bytes()).hexdigest(), row[1])

    def test_changed_archive_bytes_fail(self):
        (self.source / self.rows[0][0]).write_bytes(b"Changed bytes")
        with tarfile.open(self.archive, "w") as archive:
            archive.add(self.source, arcname=".")
        self.verify(False)

    def test_missing_archived_file_fails(self):
        (self.source / self.rows[0][0]).unlink()
        with tarfile.open(self.archive, "w") as archive:
            archive.add(self.source, arcname=".")
        self.verify(False)

    def test_extra_archived_file_fails(self):
        (self.source / "order-files/extra.txt").write_bytes(b"Extra")
        with tarfile.open(self.archive, "w") as archive:
            archive.add(self.source, arcname=".")
        self.verify(False)

    def test_missing_required_database_reference_fails(self):
        with self.references.open("a", newline="\n") as output:
            output.write("order-files/missing.txt\t" + "a" * 64 + "\t1\trequired\n")
        self.verify(False)

    def test_changed_database_checksum_fails(self):
        self.references.write_text(self.references.read_text().replace(self.rows[0][1], "0" * 64), newline="\n")
        self.verify(False)

    def test_changed_database_size_fails(self):
        self.references.write_text(self.references.read_text().replace("\t" + self.rows[0][2] + "\trequired", "\t999\trequired"), newline="\n")
        self.verify(False)

    def test_recorded_deleted_reference_can_be_absent(self):
        with self.references.open("a", newline="\n") as output:
            output.write("order-files/deleted.txt\t" + "a" * 64 + "\t1\tretired\n")
        self.verify(True)

    def test_unreferenced_bytes_preserved_and_counted(self):
        self.references.write_text("")
        self.assertIn("file_restore_unreferenced_files=2", self.verify(True).stdout)

    def test_invoice_reference_checks_hash_without_unknown_size(self):
        self.references.write_text("\t".join(self.rows[0][:2]) + "\tunknown\trequired\n", newline="\n")
        self.verify(True)

    def test_parent_traversal_archive_rejected_before_extract(self):
        with tarfile.open(self.archive, "w") as archive:
            member = tarfile.TarInfo("../escape.txt")
            member.size = 1
            archive.addfile(member, io.BytesIO(b"X"))
        self.verify(False)
        self.assertFalse((self.root / "escape.txt").exists())
        self.assertEqual(list(self.destination.iterdir()), [])

    def test_symlink_archive_rejected_before_extract(self):
        with tarfile.open(self.archive, "w") as archive:
            member = tarfile.TarInfo("order-files/link")
            member.type = tarfile.SYMTYPE
            member.linkname = "/etc"
            archive.addfile(member)
        self.verify(False)
        self.assertEqual(list(self.destination.iterdir()), [])

    def test_hardlink_archive_rejected_before_extract(self):
        with tarfile.open(self.archive, "w") as archive:
            member = tarfile.TarInfo("order-files/link")
            member.type = tarfile.LNKTYPE
            member.linkname = self.rows[0][0]
            archive.addfile(member)
        self.verify(False)
        self.assertEqual(list(self.destination.iterdir()), [])

    def test_duplicate_archive_path_rejected(self):
        with tarfile.open(self.archive, "w") as archive:
            for _ in range(2):
                member = tarfile.TarInfo("order-files/duplicate.txt")
                member.size = 1
                archive.addfile(member, io.BytesIO(b"X"))
        self.verify(False)

    def test_empty_archive_and_reference_set(self):
        shutil.rmtree(self.source)
        self.source.mkdir()
        self.rows = []
        self.repack()
        self.verify(True)


if __name__ == "__main__":
    unittest.main()
