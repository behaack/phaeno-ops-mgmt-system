export function Dialog(props) {
  const { open, onClose, title, children, actions, style } = props;
  if (!open) return null;

  return React.createElement(
    'div',
    {
      role: 'presentation',
      onClick: onClose,
      style: {
        position: 'fixed', inset: 0, background: 'rgb(14 40 65 / 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 'var(--space-6)',
      },
    },
    React.createElement(
      'div',
      {
        role: 'dialog',
        'aria-modal': true,
        'aria-label': title,
        onClick: (e) => e.stopPropagation(),
        style: {
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-overlay)',
          padding: 'var(--space-8)',
          maxWidth: '32rem',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          ...style,
        },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' } },
        title ? React.createElement('h3', { style: { margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)' } }, title) : React.createElement('span'),
        React.createElement(IconButton, { icon: 'x', label: 'Close dialog', variant: 'ghost', size: 32, onClick: onClose })
      ),
      React.createElement('div', { style: { fontSize: 'var(--font-size-md)', color: 'var(--color-text)', lineHeight: 'var(--line-height-copy)' } }, children),
      actions ? React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' } }, actions) : null
    )
  );
}
