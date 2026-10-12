#!/usr/bin/env python3
"""Guarded, additive recovery of two Website tables from the retained backup DB."""
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import select
import shutil
import subprocess
import sys
import tarfile
import time

DB_CONTAINER = 'phaeno-portal-green-db'
LIVE_DB = 'phaeno_portal_green'
BACKUP_DB = 'phaeno_portal_green_before_20260929'
TABLES = ('web_contacts', 'web_orders')
ROOT = Path('/opt/phaeno.portal-green')
EXPECTED_FILES = {
    'final-before.dump.enc': '492bee08c1fc814f8f1b3faf551ce6701207d27d2f96be5b53e4117e0f93cfac',
    'final-before.key.enc': '19c4729538bd3fe0eb9d10b217b4482292cf500a80b4a52b077e2f31458c7ccd',
}


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def require(condition, label):
    if not condition:
        raise RuntimeError(label)


def main():
    os.umask(0o077)
    mode, revision, operation, expected_digest = sys.argv[1:]
    require(os.geteuid() == 0 and mode in ('preview', 'restore'), 'arguments')
    require(re.fullmatch(r'[0-9a-f]{40}', revision), 'revision')
    require(re.fullmatch(r'github-actions-[0-9]+-[0-9]+', operation), 'operation')
    require(mode == 'preview' or re.fullmatch(r'[0-9a-f]{64}', expected_digest), 'expected_digest')
    base = ROOT / 'maintenance' / ('website-recovery-' + operation)
    require(base.is_dir() and not base.is_symlink(), 'maintenance_directory')
    work = base / 'private'
    work.mkdir(mode=0o700)
    log = (work / 'private-errors.log').open('wb')
    scratch = 'phaeno_website_recovery_' + operation.removeprefix('github-actions-').replace('-', '_')
    marker = 'phaeno-website-recovery:' + operation + ':' + revision
    container_dir = '/tmp/website-recovery-' + operation
    scratch_oid = None
    live = None
    phase = 'preflight'
    committed = False
    commit_submitted = False
    container_created = False
    receipts = []
    buffer = b''

    def run(args, data=None):
        result = subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=log, timeout=60)
        require(result.returncode == 0, phase)
        return result.stdout

    def sql(database, text):
        return run(['docker', 'exec', '-i', DB_CONTAINER, 'psql', '-U', LIVE_DB, '-d', database,
                    '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], text.encode()).decode().strip()

    def emit(value):
        receipts.append(value)
        (base / 'receipt.json').write_text(json.dumps(receipts, sort_keys=True))
        print(json.dumps(value, sort_keys=True), flush=True)

    def read_to_marker(token):
        nonlocal buffer
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            while b'\n' in buffer:
                line, buffer = buffer.split(b'\n', 1)
                text = line.decode().strip()
                if text == token:
                    return
                if text.startswith('{'):
                    emit(json.loads(text))
            ready, _, _ = select.select([live.stdout], [], [], 1)
            if ready:
                chunk = os.read(live.stdout.fileno(), 65536)
                require(chunk, phase)
                buffer += chunk
        raise RuntimeError('transaction_timeout')

    try:
        db = json.loads(run(['docker', 'inspect', DB_CONTAINER]))[0]
        api = json.loads(run(['docker', 'inspect', 'phaeno-portal-green-api']))[0]
        require(db['State']['Running'] and api['State']['Health']['Status'] == 'healthy', 'service_health')
        require(any(m.get('Name') == 'phaeno-portal-green-postgres18-data' for m in db['Mounts']), 'database_volume')
        env = dict(v.split('=', 1) for v in api['Config']['Env'])
        connection = {key.strip().lower(): value.strip() for key, value in
                      (v.split('=', 1) for v in env['ConnectionStrings__DefaultConnection'].split(';') if '=' in v)}
        require(connection.get('database') == LIVE_DB and connection.get('host') in ('db', 'postgres', DB_CONTAINER), 'live_database')
        require(not any(db['NetworkSettings']['Ports'].values()), 'database_network')
        require(sql('postgres', "SELECT NOT datallowconn FROM pg_database WHERE datname='" + BACKUP_DB + "';") == 't', 'backup_connections')
        require(sql(LIVE_DB, "SELECT count(*) FROM pg_trigger WHERE tgrelid IN ('website.web_contacts'::regclass,'website.web_orders'::regclass) AND NOT tgisinternal AND tgenabled<>'D';") == '0', 'unexpected_table_triggers')
        require(shutil.disk_usage(ROOT).free > 256 * 1024 * 1024, 'host_capacity')
        recovery_root = ROOT / 'reset-20260929'
        for leaf, expected in EXPECTED_FILES.items():
            matches = [p for p in recovery_root.rglob(leaf) if p.is_file() and not p.is_symlink()]
            require(matches and any(digest(p) == expected for p in matches), 'verified_backup_files')

        phase = 'isolated_backup_copy'
        require(sql('postgres', "SELECT count(*) FROM pg_database WHERE datname='" + scratch + "';") == '0', 'scratch_exists')
        sql('postgres', f'CREATE DATABASE "{scratch}" WITH TEMPLATE "{BACKUP_DB}" OWNER "{LIVE_DB}";')
        scratch_oid = sql('postgres', f"SELECT oid FROM pg_database WHERE datname='{scratch}';")
        sql('postgres', f"COMMENT ON DATABASE \"{scratch}\" IS '{marker}';")
        run(['docker', 'exec', DB_CONTAINER, 'mkdir', '-m', '700', container_dir])
        container_created = True

        phase = 'table_schema'
        schema_query = """SELECT json_agg(row_to_json(d) ORDER BY d.table_name,d.column_name) FROM (
          SELECT c.relname AS table_name,a.attname AS column_name,format_type(a.atttypid,a.atttypmod) AS data_type,a.attnotnull AS required
          FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='website' AND c.relname IN ('web_contacts','web_orders') AND a.attnum>0 AND NOT a.attisdropped
        ) d;"""
        schema = json.loads(sql(LIVE_DB, schema_query))
        require(schema == json.loads(sql(scratch, schema_query)), 'source_target_schema_mismatch')
        columns = {table: [item['column_name'] for item in schema if item['table_name'] == table] for table in TABLES}
        require(all(re.fullmatch('[a-z][a-z0-9_]*', name) for names in columns.values() for name in names), 'column_names')
        source_hashes = {}
        for table in TABLES:
            names = ','.join('"' + name + '"' for name in columns[table])
            sql(scratch, f"SET TIME ZONE 'UTC';\n\\copy (SELECT {names} FROM website.{table} ORDER BY id) TO '{container_dir}/{table}.csv' WITH (FORMAT csv, HEADER true)\n")
            run(['docker', 'cp', DB_CONTAINER + ':' + container_dir + '/' + table + '.csv', str(work / (table + '.csv'))])
            source_hashes[table] = digest(work / (table + '.csv'))
        source_digest = hashlib.sha256(json.dumps({'schema': schema, 'files': source_hashes}, sort_keys=True).encode()).hexdigest()
        require(mode == 'preview' or expected_digest == source_digest, 'source_changed_after_preview')
        emit({'mode': mode, 'source_rows_digest': source_digest, 'source': 'retained_pre_reset_backup_database', 'backup_connections_changed': False})

        phase = 'candidate_validation'
        prefix = "BEGIN;\nSET LOCAL lock_timeout='5s';\nSET LOCAL statement_timeout='30s';\nSET LOCAL TIME ZONE 'UTC';\n"
        for table in TABLES:
            names = ','.join('"' + name + '"' for name in columns[table])
            prefix += f"CREATE TEMP TABLE restored_{table} (LIKE website.{table} INCLUDING ALL);\n"
            prefix += f"\\copy restored_{table} ({names}) FROM '{container_dir}/{table}.csv' WITH (FORMAT csv, HEADER true)\n"
        prefix += "LOCK TABLE website.web_contacts,website.web_orders IN SHARE ROW EXCLUSIVE MODE;\n"
        for table in TABLES:
            prefix += f"CREATE TEMP TABLE before_{table} AS TABLE website.{table};\n"
            prefix += f"DO $$ BEGIN IF EXISTS (SELECT 1 FROM restored_{table} s JOIN website.{table} t USING(id) WHERE to_jsonb(s) IS DISTINCT FROM to_jsonb(t)) THEN RAISE EXCEPTION 'Existing record conflict'; END IF; END $$;\n"
        prefix += """DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM restored_web_contacts s JOIN website.web_contacts t ON s.normalized_email=t.normalized_email AND s.id<>t.id)
          THEN RAISE EXCEPTION 'Existing email identity conflict'; END IF;
        END $$;
        SELECT json_build_object('source_contacts',(SELECT count(*) FROM restored_web_contacts),'source_demo_requests',(SELECT count(*) FROM restored_web_orders),
          'contacts_before',(SELECT count(*) FROM website.web_contacts),'demo_requests_before',(SELECT count(*) FROM website.web_orders),
          'contacts_to_insert',(SELECT count(*) FROM restored_web_contacts s WHERE NOT EXISTS(SELECT 1 FROM website.web_contacts t WHERE t.id=s.id)),
          'demo_requests_to_insert',(SELECT count(*) FROM restored_web_orders s WHERE NOT EXISTS(SELECT 1 FROM website.web_orders t WHERE t.id=s.id)),
          'source_active_contacts',(SELECT count(*) FROM restored_web_contacts WHERE unsubscribed_at_utc IS NULL),
          'source_open_demo_requests',(SELECT count(*) FROM restored_web_orders WHERE completed_at_utc IS NULL));
        """
        for table in TABLES:
            names = ','.join('"' + name + '"' for name in columns[table])
            prefix += f"\\copy (SELECT {names} FROM website.{table} ORDER BY id) TO '{container_dir}/before_{table}.csv' WITH (FORMAT csv, HEADER true)\n"
        prefix += '\\echo BACKUP_READY\n'
        live = subprocess.Popen(['docker', 'exec', '-i', DB_CONTAINER, 'psql', '-U', LIVE_DB, '-d', LIVE_DB,
                                 '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log)
        live.stdin.write(prefix.encode()); live.stdin.flush()
        read_to_marker('BACKUP_READY')

        if mode == 'restore':
            phase = 'fresh_table_backup'
            public_key = base / 'backup-public.pem'
            require(public_key.is_file() and not public_key.is_symlink(), 'backup_public_key')
            backup_dir = ROOT / 'reset-20260929' / ('website-recovery-' + operation)
            backup_dir.mkdir(mode=0o700)
            for table in TABLES:
                run(['docker', 'cp', DB_CONTAINER + ':' + container_dir + '/before_' + table + '.csv', str(work / ('before_' + table + '.csv'))])
                names = ','.join('"' + name + '"' for name in columns[table])
                verify = f"BEGIN;SET LOCAL TIME ZONE 'UTC';CREATE TEMP TABLE verify_rows (LIKE website.{table} INCLUDING ALL);\n"
                verify += f"\\copy verify_rows ({names}) FROM '{container_dir}/before_{table}.csv' WITH (FORMAT csv, HEADER true)\n"
                verify += f"\\copy (SELECT {names} FROM verify_rows ORDER BY id) TO '{container_dir}/roundtrip_{table}.csv' WITH (FORMAT csv, HEADER true)\nROLLBACK;\n"
                sql(scratch, verify)
                run(['docker', 'cp', DB_CONTAINER + ':' + container_dir + '/roundtrip_' + table + '.csv', str(work / ('roundtrip_' + table + '.csv'))])
                require(digest(work / ('before_' + table + '.csv')) == digest(work / ('roundtrip_' + table + '.csv')), 'table_backup_restore_check')
            (work / 'schema.json').write_text(json.dumps(schema, sort_keys=True))
            plain_archive = work / 'before-tables.tar'
            with tarfile.open(plain_archive, 'w') as archive:
                for leaf in ('schema.json', 'before_web_contacts.csv', 'before_web_orders.csv'):
                    archive.add(work / leaf, arcname=leaf)
            passphrase = work / 'backup.pass'
            passphrase.write_text(secrets.token_hex(32))
            encrypted = backup_dir / 'before-tables.tar.enc'
            wrapped = backup_dir / 'before-tables.key.enc'
            run(['openssl', 'enc', '-aes-256-cbc', '-pbkdf2', '-iter', '250000', '-salt', '-pass', 'file:' + str(passphrase), '-in', str(plain_archive), '-out', str(encrypted)])
            run(['openssl', 'pkeyutl', '-encrypt', '-pubin', '-inkey', str(public_key), '-pkeyopt', 'rsa_padding_mode:oaep', '-pkeyopt', 'rsa_oaep_md:sha256', '-pkeyopt', 'rsa_mgf1_md:sha256', '-in', str(passphrase), '-out', str(wrapped)])
            decrypted = work / 'roundtrip.tar'
            run(['openssl', 'enc', '-d', '-aes-256-cbc', '-pbkdf2', '-iter', '250000', '-pass', 'file:' + str(passphrase), '-in', str(encrypted), '-out', str(decrypted)])
            require(digest(plain_archive) == digest(decrypted), 'backup_encryption_roundtrip')
            emit({'current_table_backup_verified': True, 'encrypted_archive_sha256': digest(encrypted), 'wrapped_key_sha256': digest(wrapped)})

        phase = 'additive_restore' if mode == 'restore' else 'preview_rollback'
        suffix = ''
        if mode == 'restore':
            for table in TABLES:
                names = ','.join('"' + name + '"' for name in columns[table])
                selected = ','.join('s."' + name + '"' for name in columns[table])
                suffix += f"INSERT INTO website.{table} ({names}) SELECT {selected} FROM restored_{table} s WHERE NOT EXISTS(SELECT 1 FROM website.{table} t WHERE t.id=s.id);\n"
                suffix += f"DO $$ BEGIN IF EXISTS (SELECT 1 FROM restored_{table} s LEFT JOIN website.{table} t USING(id) WHERE t.id IS NULL OR to_jsonb(s) IS DISTINCT FROM to_jsonb(t)) OR EXISTS (SELECT 1 FROM before_{table} b LEFT JOIN website.{table} t USING(id) WHERE t.id IS NULL OR to_jsonb(b) IS DISTINCT FROM to_jsonb(t)) THEN RAISE EXCEPTION 'Recovery conservation check failed'; END IF; END $$;\n"
            suffix += "SELECT json_build_object('contacts_after',(SELECT count(*) FROM website.web_contacts),'demo_requests_after',(SELECT count(*) FROM website.web_orders),'active_contacts_after',(SELECT count(*) FROM website.web_contacts WHERE unsubscribed_at_utc IS NULL),'open_demo_requests_after',(SELECT count(*) FROM website.web_orders WHERE completed_at_utc IS NULL));\nCOMMIT;\n"
        else:
            suffix += 'ROLLBACK;\n'
        suffix += '\\echo RECOVERY_DONE\n\\q\n'
        commit_submitted = mode == 'restore'
        live.stdin.write(suffix.encode()); live.stdin.flush()
        read_to_marker('RECOVERY_DONE')
        live.stdin.close()
        require(live.wait(timeout=15) == 0, 'transaction_exit')
        live = None
        committed = mode == 'restore'
        emit({'restored': committed, 'current_rows_preserved': True, 'only_live_tables': ['website.web_contacts', 'website.web_orders'], 'notifications_replayed': False})
    except Exception:
        print('website_recovery=FAIL phase=' + phase, flush=True)
        raise
    finally:
        if live is not None:
            live.stdin.close()
            try:
                live.wait(timeout=10)
            except subprocess.TimeoutExpired:
                live.terminate(); live.wait(timeout=5)
        if scratch_oid is not None:
            current = sql('postgres', f"SELECT oid || '|' || coalesce(shobj_description(oid,'pg_database'),'') FROM pg_database WHERE datname='{scratch}';")
            require(current == scratch_oid + '|' + marker, 'scratch_cleanup_identity')
            sql('postgres', f'DROP DATABASE "{scratch}";')
        if container_created and container_dir.startswith('/tmp/website-recovery-github-actions-'):
            run(['docker', 'exec', DB_CONTAINER, 'rm', '-rf', '--', container_dir])
        for item in work.iterdir():
            if item.is_file() and item.name != 'private-errors.log':
                run(['shred', '--remove', '--', str(item)])
        emit({'scratch_cleanup_complete': True, 'backup_database_connections_enabled': False,
              'restore_committed': True if committed else None if commit_submitted else False})
        log.close()


if __name__ == '__main__':
    try:
        main()
    except Exception:
        sys.exit(1)
