<!-- @dsCard group="Components" viewport="700x260" name="Tabs" -->
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
const { Tabs } = window.PhaenoDesignSystem_cb96f6;

function Demo() {
  return (
    <Tabs items={[
      { value: 'ruo', label: 'RUO service', content: <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>Specimens sent to Phaeno for sequencing; raw data or custom analysis delivered back.</p> },
      { value: 'clia', label: 'Clinical (CLIA)', content: <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>Available as a reference-lab service beginning 2026.</p> },
      { value: 'kits', label: 'IVD kits', content: <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>PSeq kits run in the customer's own lab with cloud-based analysis.</p> },
    ]} />
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<Demo />);
</script>
</body>
</html>
