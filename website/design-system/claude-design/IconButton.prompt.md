export function IconButton(props) {
  const { icon, label, variant = 'secondary', size = 44, disabled = false, onClick, style, ...rest } = props;
  const [hover, setHover] = React.useState(false);

  const variants = {
    primary: { background: 'var(--color-action-primary)', color: 'var(--color-text-on-dark)', border: '1px solid transparent' },
    secondary: { background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border-strong)' },
    ghost: { background: 'transparent', color: 'var(--color-text)', border: '1px solid transparent' },
  };
  const hoverBg = {
    primary: 'var(--color-action-primary-hover)',
    secondary: 'var(--color-surface-subtle)',
    ghost: 'var(--color-surface-subtle)',
  };
  const look = variants[variant];

  return React.createElement(
    'button',
    {
      type: 'button',
      disabled,
      onClick,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      'aria-label': label,
      title: label,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        minWidth: 44,
        minHeight: 44,
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background var(--duration-base) var(--ease-standard)',
        ...look,
        background: hover && !disabled ? hoverBg[variant] : look.background,
        ...style,
      },
      ...rest,
    },
    React.createElement(Icon, { name: icon, size: 20 })
  );
}
