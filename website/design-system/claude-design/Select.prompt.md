Single-select radio control — group with a shared `name`.

```jsx
<Radio name="tier" value="ruo" label="Research use only" checked={tier==='ruo'} onChange={() => setTier('ruo')} />
<Radio name="tier" value="clia" label="Clinical (CLIA)" checked={tier==='clia'} onChange={() => setTier('clia')} />
```
