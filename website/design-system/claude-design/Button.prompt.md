export function Button(props) {
  const {
    children,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'trailing',
    disabled = false,
    type = 'button',
    onClick,
    style,
    ...rest
  } = props;

  const sizes = {
    sm: { padding: '0.5rem 0.875rem', fontSize: 'var(--font-size-sm)', gap: '0.375rem' },
    md: { padding: '0.75rem 1.25rem', fontSize: 'var(--font-size-md)', gap: '0.5rem' },
    lg: { padding: '0.875rem 1.5rem', fontSize: 'var(--font-size-lg)', gap: '0.625rem' },
  };

  const variants = {
    primary: {
      background: 'var(--color-action-primary)',
      color: 'var(--color-text-on-dark)',
      border: '1px solid transparent',
    },
    secondary: {
      background: 'var(--color-surface)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-border-strong)',
    },
    tertiary: {
      background: 'transparent',
      color: 'var(--color-link)',
      border: '1px solid transparent',
      padding: '0.25rem 0',
    },
  };

  const hoverBg = {
    primary: 'var(--color-action-primary-hover)',
    secondary: 'var(--color-surface-subtle)',
    tertiary: 'transparent',
  };

  const [hover, setHover] = React.useState(false);
  const base = sizes[size];
  const look = variants[variant];

  return React.createElement(
    'button',
    {
      type,
      disabled,
      onClick,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: iconPosition === 'leading' ? 'row-reverse' : 'row',
        gap: base.gap,
        padding: base.padding,
        fontSize: base.fontSize,
        fontFamily: 'var(--font-family-sans)',
        fontWeight: 'var(--font-weight-medium)',
        lineHeight: 1,
        borderRadius: variant === 'tertiary' ? 0 : 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: `background var(--duration-base) var(--ease-standard), border-color var(--duration-base) var(--ease-standard), opacity var(--duration-base) var(--ease-standard)`,
        opacity: disabled ? 0.45 : 1,
        ...look,
        background: hover && !disabled ? hoverBg[variant] : look.background,
        textDecoration: variant === 'tertiary' && hover ? 'underline' : 'none',
        ...style,
      },
      'aria-disabled': disabled,
      ...rest,
    },
    children,
    icon ? React.createElement(Icon, { name: icon, size: size === 'sm' ? 16 : 18 }) : null
  );
}
