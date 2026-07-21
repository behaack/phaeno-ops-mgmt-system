export function Badge(props) {
  const { children, tone = 'neutral', style, ...rest } = props;

  const tones = {
    neutral: { background: 'var(--phaeno-neutral-100)', color: 'var(--color-text)' },
    brand: { background: 'var(--color-surface-brand)', color: 'var(--color-brand-strong)' },
    rna: { background: 'var(--phaeno-rna-100)', color: 'var(--phaeno-rna-800)' },
    evidence: { background: 'var(--phaeno-amber-100)', color: 'var(--phaeno-amber-600)' },
    danger: { background: '#fbe9e7', color: 'var(--color-danger)' },
  };

  return React.createElement(
    'span',
    {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.125rem 0.625rem',
        borderRadius: 'var(--radius-pill)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-medium)',
        lineHeight: 1.6,
        letterSpacing: '0.01em',
        ...tones[tone],
        ...style,
      },
      ...rest,
    },
    children
  );
}
