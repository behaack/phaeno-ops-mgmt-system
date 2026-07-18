export function Select(props) {
  const { label, options = [], value, onChange, placeholder, disabled = false, required = false, style, id, ...rest } = props;
  const selectId = id || React.useId();

  return React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', ...style } },
    label
      ? React.createElement('label', { htmlFor: selectId, style: { fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text)' } }, label)
      : null,
    React.createElement(
      'div',
      { style: { position: 'relative' } },
      React.createElement(
        'select',
        {
          id: selectId,
          value,
          onChange,
          disabled,
          required,
          style: {
            width: '100%',
            appearance: 'none',
            padding: '0.625rem 2.25rem 0.625rem 0.875rem',
            fontSize: 'var(--font-size-md)',
            fontFamily: 'var(--font-family-sans)',
            color: 'var(--color-text)',
            background: disabled ? 'var(--color-surface-subtle)' : 'var(--color-surface)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 'var(--radius-md)',
            outline: 'none',
          },
          ...rest,
        },
        placeholder ? React.createElement('option', { value: '', disabled: true }, placeholder) : null,
        options.map((opt) => React.createElement('option', { key: opt.value, value: opt.value }, opt.label))
      ),
      React.createElement(Icon, {
        name: 'chevronDown', size: 16,
        style: { position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' },
      })
    )
  );
}
