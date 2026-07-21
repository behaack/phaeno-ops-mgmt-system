<!-- @dsCard group="Components" viewport="700x420" name="Buttons, IconButtons, Badges, Tags" -->
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="../../styles.css">
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" crossorigin></script>
<script src="../../_ds_bundle.js"></script>
<style>body{padding:20px;background:var(--color-canvas)}</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
const { Button, IconButton, Badge, Tag } = window.PhaenoDesignSystem_cb96f6;

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

function Demo() {
  const [selected, setSelected] = React.useState(true);
  return (
    <div>
      <Row label="Button — variants">
        <Button variant="primary">Request a demo</Button>
        <Button variant="secondary" icon="arrowRight">Read the study</Button>
        <Button variant="tertiary" icon="arrowRight">See performance data</Button>
        <Button variant="primary" disabled>Disabled</Button>
      </Row>
      <Row label="Button — sizes">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </Row>
      <Row label="IconButton">
        <IconButton icon="search" label="Search" variant="ghost" />
        <IconButton icon="menu" label="Open menu" variant="secondary" />
        <IconButton icon="download" label="Download" variant="primary" />
      </Row>
      <Row label="Badge">
        <Badge tone="neutral">Neutral</Badge>
        <Badge tone="brand">Validated</Badge>
        <Badge tone="rna">Platform</Badge>
        <Badge tone="evidence">RUO</Badge>
        <Badge tone="danger">Error</Badge>
      </Row>
      <Row label="Tag">
        <Tag selected={selected} onClick={() => setSelected(!selected)}>Isoform</Tag>
        <Tag onRemove={() => {}}>Oncology</Tag>
        <Tag>Public health</Tag>
      </Row>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Demo />);
</script>
</body>
</html>
