export function Radio(props) {
  const { label, checked = false, onChange, disabled = false, name, value, style, id, ...rest } = props;
  const radioId = id || React.useId();

  return React.createElement(
    'label',
    {
      htmlFor: radioId,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
      },
    },
    React.createElement('input', {
      type: 'radio', id: radioId, checked, onChange, disabled, name, value,
      style: { position: 'absolute', opacity: 0, width: 20, height: 20, margin: 0 },
      ...rest,
    }),
    React.createElement(
      'span',
      {
        'aria-hidden': true,
        style: {
          width: 20, height: 20, minWidth: 20, borderRadius: '50%',
          border: `1px solid ${checked ? 'var(--color-brand-strong)' : 'var(--color-border-strong)'}`,
          background: 'var(--color-surface)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color var(--duration-fast) var(--ease-standard)',
        },
      },
      checked ? React.createElement('span', { style: { width: 10, height: 10, borderRadius: '50%', background: 'var(--color-action-primary)' } }) : null
    ),
    label ? React.createElement('span', { style: { fontSize: 'var(--font-size-md)', color: 'var(--color-text)' } }, label) : null
  );
}
