"""Regenerate the complete application ERD from the committed-format EF snapshot.
Run from the repository root: python scripts/generate-database-erd.py
No database connection or third-party packages are required.
"""
from pathlib import Path
import re
from collections import defaultdict

root = Path(__file__).resolve().parents[1]
source = root / 'backend/app/Migrations/PSeqOperationsDbContextModelSnapshot.cs'
target = root / 'docs/database-erd.md'
text = source.read_text(encoding='utf-8')
blocks = re.findall(r'modelBuilder.Entity\("([^"]+)", b =>\s*\{(.*?)\n                \}\);', text, re.S)
entities = {}
for name, body in blocks:
    table = re.search(r'b.ToTable\("([^"]+)", "([^"]+)"', body)
    if not table:
        continue
    properties = {}
    for kind, prop, definition in re.findall(r'b.(?:Property|PrimitiveCollection)<([^>]+)>\("([^"]+)"\)(.*?);', body, re.S):
        column = re.search(r'HasColumnName\("([^"]+)"\)', definition)
        datatype = re.search(r'HasColumnType\("([^"]+)"\)', definition)
        assert column and datatype, (name, prop)
        nullable = '?' in kind or ((kind == 'string' or kind.endswith('[]')) and '.IsRequired()' not in definition)
        properties[prop] = dict(column=column[1], datatype=datatype[1], nullable=nullable, keys=set())
    assert properties, name
    for columns in re.findall(r'b.HasKey\(([^)]+)\)', body):
        for prop in re.findall(r'"([^"]+)"', columns): properties[prop]['keys'].add('PK')
    for columns, definition in re.findall(r'b.HasIndex\(([^)]+)\)(.*?);', body, re.S):
        if '.IsUnique()' in definition:
            for prop in re.findall(r'"([^"]+)"', columns): properties[prop]['keys'].add('UK')
    entities[name] = dict(table=table[1], schema=table[2], properties=properties, fks=[])
for name, body in blocks:
    for principal, definition in re.findall(r'b.HasOne\("([^"]+)"[^)]*\)(.*?);', body, re.S):
        columns = re.search(r'HasForeignKey\(([^)]+)\)', definition)
        if not columns: continue
        assert name in entities and principal in entities, (name, principal)
        props = re.findall(r'"([^"]+)"', columns[1])
        props = [p for p in props if p in entities[name]['properties']]
        assert props, (name, columns[1])
        for prop in props: entities[name]['properties'][prop]['keys'].add('FK')
        entities[name]['fks'].append((principal, props, '.WithOne(' in definition))

# Keep existing readable feature groups where possible; newly discovered tables
# are grouped by their owning namespace.
groups_by_table = {}
schema = group = None
for line in target.read_text(encoding='utf-8').splitlines():
    if line.startswith('## `'): schema = line.split('`')[1].split(' ')[0]
    elif line.startswith('### '): group = line[4:]
    elif re.match(r'    \w+ \{', line) and schema and group: groups_by_table[(schema, line.strip().split()[0])] = group
schemas = defaultdict(lambda: defaultdict(list))
for name, entity in entities.items():
    group = groups_by_table.get((entity['schema'], entity['table']))
    if group is None:
        parts = name.split('.')
        group = 'Released-deliverable retention' if '.FileManagement.' in name else parts[3] if len(parts) > 4 else 'Additional model entities'
    schemas[entity['schema']][group].append(name)
counts = {schema: (sum(len(v) for v in groups.values()), sum(len(entities[n]['properties']) for v in groups.values() for n in v), sum(len(entities[n]['fks']) for v in groups.values() for n in v)) for schema, groups in schemas.items()}
lines = ['# `phaeno_ops` database ERD', '',
'This document covers every table, column, key, and relationship in the application-owned EF Core model, plus the configured EF migration-history table in `public`.', '',
'Generated from [PSeqOperationsDbContextModelSnapshot.cs](../backend/app/Migrations/PSeqOperationsDbContextModelSnapshot.cs) by [generate-database-erd.py](../scripts/generate-database-erd.py). Re-run the script after persisted-model changes. This is model evidence; verify applied migrations separately for each environment.', '',
'## Legend and totals', '', '- `PK` = primary key; `FK` = database-enforced foreign key; `UK` = a column participating in a unique key/index. Filtered uniqueness remains subject to its model predicate.', '- Field comments state nullability. Relationship labels identify the child foreign-key columns.', '- Logical identifiers without database foreign keys are ordinary fields. PostgreSQL system schemas are excluded.', '',
'| Schema | Entities | Fields | Foreign keys |', '| --- | ---: | ---: | ---: |', '| `public` | 1 | 2 | 0 |']
for schema in sorted(counts):
    a,b,c=counts[schema]; lines.append(f'| `{schema}` | {a} | {b} | {c} |')
lines += [f'| **Total** | **{1+sum(v[0] for v in counts.values())}** | **{2+sum(v[1] for v in counts.values())}** | **{sum(v[2] for v in counts.values())}** |', '', '## `public` schema', '', '### EF migration history', '', '```mermaid', 'erDiagram', '    __ef_migrations_history {', '        varchar_150 MigrationId PK "not null"', '        varchar_32 ProductVersion "not null"', '    }', '```', '']
for schema, groups in sorted(schemas.items()):
    lines += [f'## `{schema}` schema', '']
    for group, names in sorted(groups.items()):
        # Keep diagrams bounded for Mermaid rendering.
        names = sorted(names, key=lambda n: entities[n]['table'])
        for start in range(0, len(names), 10):
            chunk = names[start:start+10]
            title = group if len(names) <= 10 else f'{group} ({start//10+1})'
            lines += [f'### {title}', '', '```mermaid', 'erDiagram']
            for name in chunk:
                e = entities[name]; lines.append(f"    {e['table']} {{")
                for prop,p in e['properties'].items():
                    kind = re.sub(r'[^a-zA-Z0-9_]', '_', p['datatype'].replace('[]', '_array')).strip('_')
                    keys = ','.join(k for k in ['PK','FK','UK'] if k in p['keys'])
                    nullable = 'nullable' if p['nullable'] else 'not null'
                    lines.append(f"        {kind} {p['column']} {keys} \"{nullable}\"".replace('  "', ' "'))
                lines.append('    }')
            for name in chunk:
                e = entities[name]
                for principal, props, unique in e['fks']:
                    p = entities[principal]
                    left = 'o|' if any(e['properties'][prop]['nullable'] for prop in props) else '||'
                    right = 'o|' if unique else 'o{'
                    columns = ', '.join(e['properties'][prop]['column'] for prop in props)
                    lines.append(f"    {p['table']} {left}--{right} {e['table']} : \"{columns}\"")
            lines += ['```', '']
target.write_text('\n'.join(lines), encoding='utf-8', newline='\n')
print(f'Generated {len(entities)} model tables, {sum(v[1] for v in counts.values())} fields, {sum(v[2] for v in counts.values())} foreign keys.')
