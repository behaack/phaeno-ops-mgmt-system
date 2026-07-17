import { describe, expect, it } from 'vitest'

import {
  POMS_FULL_NAME,
  getApplicationBranding,
} from './application-branding'

describe('getApplicationBranding', () => {
  it('uses POMS for the internal Phaeno organization', () => {
    expect(getApplicationBranding('Phaeno')).toEqual({
      name: 'POMS',
      fullName: POMS_FULL_NAME,
    })
  })

  it.each(['Prospect', 'Customer', 'Partner'] as const)(
    'uses Portal for the %s organization context',
    (organizationKind) => {
      expect(getApplicationBranding(organizationKind)).toEqual({
        name: 'Portal',
        fullName: 'Portal',
      })
    },
  )

  it('uses Portal before an organization context is available', () => {
    expect(getApplicationBranding()).toEqual({
      name: 'Portal',
      fullName: 'Portal',
    })
  })
})
