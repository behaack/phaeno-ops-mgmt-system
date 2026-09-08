"""Synthetic RSA/AES envelope recovery checks with the existing OpenSSL CLI."""
import hashlib
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
SHELL = os.environ.get("BACKUP_TEST_BASH", "bash")


def unix(path):
    value = Path(path).resolve().as_posix()
    return "/" + value[0].lower() + value[2:] if os.name == "nt" else value


class EnvelopeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="phaeno-envelope-fixture-")
        self.root = Path(self.temp.name).resolve()
        self.assertTrue(self.root.is_relative_to(Path(tempfile.gettempdir()).resolve()))
        self.environment = os.environ.copy()
        if os.name == "nt":
            # Git for Windows bundles native MinGW OpenSSL, whose file: password
            # option is not converted by MSYS. Adapt only the test command path.
            tools = self.root / "bin"
            tools.mkdir()
            wrapper = tools / "openssl"
            wrapper.write_text('''#!/usr/bin/env bash
args=()
for arg in "$@"; do
    case "$arg" in file:/*) arg="file:$(cygpath -m "${arg#file:}")" ;; esac
    args+=("$arg")
done
exec /mingw64/bin/openssl.exe "${args[@]}"
''', newline="\n")
            wrapper.chmod(0o700)
            self.environment["PATH"] = str(tools) + os.pathsep + self.environment["PATH"]
            self.environment["BACKUP_TEST_TOOL_DIR"] = unix(tools)
        self.plain = self.root / "plain"
        self.plain.mkdir()
        self.encrypted = self.root / "encrypted"
        self.encrypted.mkdir()
        for name in ("database.dump", "files.tar", "files.tsv", "references.tsv", "snapshot.env"):
            (self.plain / name).write_bytes(("Synthetic backup fixture " + name).encode())
        checks = "".join(hashlib.sha256((self.plain / name).read_bytes()).hexdigest() + "  " + name + "\n"
                         for name in ("database.dump", "files.tar", "files.tsv", "references.tsv", "snapshot.env"))
        (self.plain / "payload.sha256").write_text(checks, newline="\n")
        with tarfile.open(self.root / "payload.tar", "w", format=tarfile.GNU_FORMAT) as archive:
            for file in self.plain.iterdir():
                archive.add(file, arcname=file.name)
        self.command('''set -e
            chmod 700 "$1"
            openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$1/private.pem" 2>/dev/null
            chmod 600 "$1/private.pem"
            openssl pkey -in "$1/private.pem" -pubout -out "$1/public.pem" 2>/dev/null
            openssl rand -base64 48 > "$1/pass"
            openssl enc -aes-256-cbc -salt -pbkdf2 -iter 250000 -pass "file:$1/pass" -in "$1/payload.tar" -out "$1/encrypted/snapshot.tar.enc"
            openssl pkeyutl -encrypt -pubin -inkey "$1/public.pem" -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -pkeyopt rsa_mgf1_md:sha256 -in "$1/pass" -out "$1/encrypted/snapshot.key.enc"
        ''', self.root)
        (self.encrypted / "receipt.env").write_text("Synthetic receipt\n", newline="\n")
        self.refresh_outer_hashes()

    def tearDown(self):
        self.temp.cleanup()

    def command(self, code, *args):
        if os.name == "nt":
            code = 'export PATH="$BACKUP_TEST_TOOL_DIR:$PATH"\n' + code
        result = subprocess.run([SHELL, "-c", code, "--", *(unix(arg) for arg in args)],
                                capture_output=True, text=True, timeout=30, env=self.environment)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result

    def refresh_outer_hashes(self):
        names = ("snapshot.tar.enc", "snapshot.key.enc", "receipt.env")
        (self.encrypted / "encrypted.sha256").write_text("".join(
            hashlib.sha256((self.encrypted / name).read_bytes()).hexdigest() + "  " + name + "\n"
            for name in names), newline="\n")

    def restore(self, success):
        destination = self.root / "recovered"
        command = [SHELL, unix(HERE.parent / "restore-backup-envelope.sh"),
                   unix(self.encrypted), unix(self.root / "private.pem"), unix(destination)]
        if os.name == "nt":
            command = [SHELL, "-c", 'export PATH="$BACKUP_TEST_TOOL_DIR:$PATH"; exec bash "$@"', "--", *command[1:]]
        result = subprocess.run(command,
                                capture_output=True, text=True, timeout=30, env=self.environment)
        if success:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("backup_envelope_restore=PASS", result.stdout)
            for file in self.plain.iterdir():
                self.assertEqual((destination / file.name).read_bytes(), file.read_bytes())
            self.assertFalse((destination / "snapshot.pass").exists())
            self.assertFalse((destination / "snapshot.tar").exists())
        else:
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse(destination.exists())
        self.assertNotIn("BEGIN PRIVATE", result.stdout + result.stderr)

    def test_encrypted_populated_payload_round_trip(self):
        self.restore(True)

    def test_corrupted_encrypted_bytes_fail_before_decryption(self):
        path = self.encrypted / "snapshot.tar.enc"
        payload = bytearray(path.read_bytes())
        payload[64] ^= 1
        path.write_bytes(payload)
        self.restore(False)

    def test_wrong_recipient_key_fails_and_cleans_plaintext(self):
        self.command('openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$1/private.pem" 2>/dev/null; chmod 600 "$1/private.pem"', self.root)
        self.restore(False)

    def test_missing_encrypted_key_fails(self):
        (self.encrypted / "snapshot.key.enc").unlink()
        self.restore(False)

    def test_manifest_cannot_reference_outside_export(self):
        with (self.encrypted / "encrypted.sha256").open("a", newline="\n") as output:
            output.write("a" * 64 + "  ../private.pem\n")
        self.restore(False)


if __name__ == "__main__":
    unittest.main()
