export function Toast(props) {
  const { open = true, tone = 'info', title, children, onClose, style } = props;
  if (!open) return null;

  const tones = {
    info: { icon: 'info', color: 'var(--phaeno-rna-600)' },
    success: { icon: 'circleCheck', color: 'var(--color-brand-strong)' },
    evidence: { icon: 'alertTriangle', color: 'var(--phaeno-amber-600)' },
    danger: { icon: 'circleX', color: 'var(--color-danger)' },
  };
  const t = tones[tone];

  return React.createElement(
    'div',
    {
      role: 'status',
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        background: 'var(--color-text)',
        color: 'var(--color-text-on-dark)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        maxWidth: '24rem',
        ...style,
      },
    },
    React.createElement(Icon, { name: t.icon, size: 18, color: t.color, style: { marginTop: '0.125rem' } }),
    React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1 } },
      title ? React.createElement('div', { style: { fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' } }, title) : null,
      React.createElement('div', { style: { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-on-dark-muted)' } }, children)
    ),
    onClose ? React.createElement(IconButton, { icon: 'x', label: 'Dismiss', variant: 'ghost', size: 28, onClick: onClose, style: { color: 'var(--color-text-on-dark)' } }) : null
  );
}
