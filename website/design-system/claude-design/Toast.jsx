Modal dialog for confirmations and focused tasks. Scrim uses the RNA-midnight tone at low opacity rather than a generic black, keeping it on-brand.

```jsx
<Dialog open={open} onClose={() => setOpen(false)} title="Delete sample record?"
  actions={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary">Delete</Button></>}>
  This cannot be undone.
</Dialog>
```
