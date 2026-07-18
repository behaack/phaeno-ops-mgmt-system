<!-- @dsCard group="Components" viewport="700x360" name="Dialog, Toast, Tooltip" -->
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="../../styles.css">
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" crossorigin></script>
<script src="../../_ds_bundle.js"></script>
<style>body{padding:20px;background:var(--color-surface-subtle)}</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
const { Dialog, Toast, Tooltip, Button, Icon } = window.PhaenoDesignSystem_cb96f6;

function Demo() {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Button variant="secondary" onClick={() => setOpen(true)}>Open dialog</Button>
        <Tooltip label="Phred quality score">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14, color: 'var(--color-text-muted)' }}>
            <Icon name="info" size={16} /> Q80 accuracy
          </span>
        </Tooltip>
      </div>
      <Toast tone="success" title="Sequencing complete">Run 2026-0142 is ready for review.</Toast>
      <Toast tone="evidence" title="Preliminary result" onClose={() => {}}>Validation study still in progress.</Toast>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete sample record?"
        actions={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => setOpen(false)}>Delete</Button></>}>
        This cannot be undone.
      </Dialog>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<Demo />);
</script>
</body>
</html>
