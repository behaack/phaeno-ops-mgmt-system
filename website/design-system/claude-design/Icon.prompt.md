<!-- @dsCard group="Components" viewport="700x520" name="Input, Select, Checkbox, Radio, Switch" -->
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
const { Input, Select, Checkbox, Radio, Switch } = window.PhaenoDesignSystem_cb96f6;

function Demo() {
  const [checked, setChecked] = React.useState(true);
  const [tier, setTier] = React.useState('ruo');
  const [notify, setNotify] = React.useState(true);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 360 }}>
      <Input label="Work email" placeholder="you@lab.edu" required />
      <Input label="Sample ID" error="Sample ID is required" />
      <Select label="Sample type" placeholder="Choose one" options={[{ value: 'tumor', label: 'Tumor' }, { value: 'normal', label: 'Normal' }]} />
      <Checkbox label="I have IRB approval for this sample set" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
      <div style={{ display: 'flex', gap: 20 }}>
        <Radio name="tier" value="ruo" label="Research use only" checked={tier === 'ruo'} onChange={() => setTier('ruo')} />
        <Radio name="tier" value="clia" label="Clinical (CLIA)" checked={tier === 'clia'} onChange={() => setTier('clia')} />
      </div>
      <Switch label="Email me when results are ready" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<Demo />);
</script>
</body>
</html>
