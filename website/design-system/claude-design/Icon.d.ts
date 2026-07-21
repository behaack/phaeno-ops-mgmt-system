export function Switch(props) {
  const { label, checked = false, onChange, disabled = false, style, id, ...rest } = props;
  const switchId = id || React.useId();

  return React.createElement(
    'label',
    {
      htmlFor: switchId,
      style: { display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style },
    },
    React.createElement('input', {
      type: 'checkbox', role: 'switch', id: switchId, checked, onChange, disabled,
      style: { position: 'absolute', opacity: 0, width: 40, height: 24, margin: 0 },
      ...rest,
    }),
    React.createElement(
      'span',
      {
        'aria-hidden': true,
        style: {
          width: 40, height: 24, borderRadius: 'var(--radius-pill)',
          background: checked ? 'var(--color-action-primary)' : 'var(--phaeno-neutral-300)',
          position: 'relative', transition: 'background var(--duration-base) var(--ease-standard)', flexShrink: 0,
        },
      },
      React.createElement('span', {
        style: {
          position: 'absolute', top: 2, left: checked ? 18 : 2, width: 20, height: 20, borderRadius: '50%',
          background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)',
          transition: 'left var(--duration-base) var(--ease-standard)',
        },
      })
    ),
    label ? React.createElement('span', { style: { fontSize: 'var(--font-size-md)', color: 'var(--color-text)' } }, label) : null
  );
}
