export function Checkbox(props) {
  const { label, checked = false, onChange, disabled = false, style, id, ...rest } = props;
  const boxId = id || React.useId();

  return React.createElement(
    'label',
    {
      htmlFor: boxId,
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
      type: 'checkbox', id: boxId, checked, onChange, disabled,
      style: { position: 'absolute', opacity: 0, width: 20, height: 20, margin: 0 },
      ...rest,
    }),
    React.createElement(
      'span',
      {
        'aria-hidden': true,
        style: {
          width: 20, height: 20, minWidth: 20,
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${checked ? 'var(--color-brand-strong)' : 'var(--color-border-strong)'}`,
          background: checked ? 'var(--color-action-primary)' : 'var(--color-surface)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
        },
      },
      checked ? React.createElement(Icon, { name: 'check', size: 14, color: 'var(--color-text-on-dark)' }) : null
    ),
    label ? React.createElement('span', { style: { fontSize: 'var(--font-size-md)', color: 'var(--color-text)' } }, label) : null
  );
}
