export function Input(props) {
  const {
    label, placeholder, error, required = false, disabled = false,
    type = 'text', value, onChange, style, id, ...rest
  } = props;
  const inputId = id || React.useId();

  return React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', ...style } },
    label
      ? React.createElement(
          'label',
          { htmlFor: inputId, style: { fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text)' } },
          label,
          required ? React.createElement('span', { style: { color: 'var(--color-danger)' }, 'aria-hidden': true }, ' *') : null
        )
      : null,
    React.createElement('input', {
      id: inputId,
      type,
      placeholder,
      value,
      onChange,
      disabled,
      required,
      'aria-invalid': !!error,
      'aria-describedby': error ? `${inputId}-error` : undefined,
      style: {
        padding: '0.625rem 0.875rem',
        fontSize: 'var(--font-size-md)',
        fontFamily: 'var(--font-family-sans)',
        color: 'var(--color-text)',
        background: disabled ? 'var(--color-surface-subtle)' : 'var(--color-surface)',
        border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border-strong)'}`,
        borderRadius: 'var(--radius-md)',
        outline: 'none',
        transition: 'border-color var(--duration-fast) var(--ease-standard)',
      },
      ...rest,
    }),
    error
      ? React.createElement('div', { id: `${inputId}-error`, role: 'alert', style: { fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' } }, error)
      : null
  );
}
