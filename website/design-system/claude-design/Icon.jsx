Binary on/off toggle for settings and preferences (distinct from Checkbox, which is for multi-select lists/forms).

```jsx
<Switch label="Email me when results are ready" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
```
