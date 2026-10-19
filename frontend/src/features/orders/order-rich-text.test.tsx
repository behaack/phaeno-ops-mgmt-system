import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OrderRichText, normalizeOrderRichText } from './order-rich-text'
import { commercialDraftSchema, newDraftPhase } from './commercial-draft'

describe('order notes', () => {
  it('keeps basic pasted formatting and strips active content and attributes', () => {
    expect(normalizeOrderRichText('<p onclick="bad()"><b>Bold</b><span style="font-style:italic">Italic</span><script>bad()</script><img src=x onerror="bad()"></p>')).toBe('<p><strong>Bold</strong><em>Italic</em></p>')
    expect(normalizeOrderRichText('<div><br></div>')).toBe('')
  })
  it('renders encoded scientific text and lists without interpreting it as markup', () => {
    const { container } = render(<OrderRichText value='<p><strong>RNA &amp; DNA</strong> &lt;script&gt; &#945;</p><ol><li><u>Keep frozen</u></li></ol>' />)
    expect(screen.getByText('RNA & DNA').tagName).toBe('STRONG')
    expect(container.textContent).toContain('<script> α')
    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByRole('list').tagName).toBe('OL')
    expect(screen.getByText('Keep frozen').tagName).toBe('U')
  })
  it('validates text length separately from formatting in each field', () => {
    const draft = { jobName: 'Study', sampleTypeDefinitionId: null, storageRequirements: null, safetyDeclaration: '', usesPhases: false, phases: [newDraftPhase(1)], privateNotes: `<p><strong>${'x'.repeat(2000)}</strong></p>`, publicNotes: '<p>Customer instructions</p>' }
    expect(commercialDraftSchema.safeParse(draft).success).toBe(true)
    expect(commercialDraftSchema.safeParse({ ...draft, publicNotes: 'x'.repeat(2001) }).success).toBe(false)
  })
})
