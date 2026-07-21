export function Tag(props) {
  const { children, selected = false, onRemove, onClick, style, ...rest } = props;
  const [hover, setHover] = React.useState(false);

  return React.createElement(
    'span',
    {
      onClick,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.375rem 0.75rem',
        borderRadius: 'var(--radius-pill)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-medium)',
        cursor: onClick ? 'pointer' : 'default',
        border: selected ? '1px solid var(--color-brand-strong)' : '1px solid var(--color-border)',
        background: selected ? 'var(--color-surface-brand)' : hover ? 'var(--color-surface-subtle)' : 'var(--color-surface)',
        color: selected ? 'var(--color-brand-strong)' : 'var(--color-text)',
        transition: 'background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
        ...style,
      },
      ...rest,
    },
    children,
    onRemove
      ? React.createElement(
          'button',
          {
            type: 'button',
            'aria-label': 'Remove',
            onClick: (e) => { e.stopPropagation(); onRemove(); },
            style: { display: 'inline-flex', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit' },
          },
          React.createElement(Icon, { name: 'x', size: 14 })
        )
      : null
  );
}
