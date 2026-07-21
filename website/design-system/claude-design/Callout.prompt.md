export function Tabs(props) {
  const { items = [], value, onChange, style } = props;
  const [internal, setInternal] = React.useState(items[0]?.value);
  const active = value !== undefined ? value : internal;
  const setActive = onChange || setInternal;

  return React.createElement(
    'div',
    { style },
    React.createElement(
      'div',
      { role: 'tablist', style: { display: 'flex', gap: 'var(--space-6)', borderBottom: '1px solid var(--color-border)' } },
      items.map((item) => {
        const isActive = item.value === active;
        return React.createElement(
          'button',
          {
            key: item.value,
            role: 'tab',
            type: 'button',
            'aria-selected': isActive,
            onClick: () => setActive(item.value),
            style: {
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${isActive ? 'var(--color-brand-strong)' : 'transparent'}`,
              color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
              fontFamily: 'var(--font-family-sans)',
              fontSize: 'var(--font-size-md)',
              fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
              padding: '0.75rem 0',
              cursor: 'pointer',
              transition: 'color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
            },
          },
          item.label
        );
      })
    ),
    items.map((item) =>
      item.value === active
        ? React.createElement('div', { key: item.value, role: 'tabpanel', style: { paddingTop: 'var(--space-6)' } }, item.content)
        : null
    )
  );
}
