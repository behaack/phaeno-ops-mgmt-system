import { isAxiosError } from 'axios'

// Shared internal/external surfaces use the same catalog. en-US is the only
// enabled Portal locale; user-entered department and person names are retained.
export const departmentMessagesByLocale = {
  'en-US': {
    departments: 'Departments',
    organizationDefaults: 'Organization defaults', editDefaults: 'Edit organization defaults',
    loadingDefaults: 'Loading organization defaults…', systemDefault: 'Uses the system or commercial default',
    systemPoDefault: 'Use system default (not required)',
    defaultsDescription: 'Defaults for departments without an explicit override. Existing saved shipping and accepted-quote snapshots are retained.',
    defaultsEditDescription: 'Set defaults across this organization. Department overrides take precedence. Clearing a field restores the system or commercial fallback for future work.',
    defaultsConflict: 'Organization settings changed. The latest version is loaded and your entries are preserved. Review them before saving again.',
    discardDefaults: 'Discard your unsaved organization defaults?',
    departmentDescription: 'Operational and access boundaries within this organization. Blank overrides use the applicable organization or system default.',
    addDepartment: 'Add department', editSettings: 'Edit settings', manageMembers: 'Manage members',
    makeDefault: 'Make default', defaultLabel: 'Default', inactive: 'Inactive',
    deactivate: 'Deactivate', reactivate: 'Reactivate',
    loadingDepartments: 'Loading departments…', noDepartments: 'No departments are available to manage.',
    noDescription: 'No department description recorded.', inherits: 'Uses applicable defaults',
    overrides: (count: number) => `${new Intl.NumberFormat('en-US').format(count)} configuration ${count === 1 ? 'override' : 'overrides'}`,
    activeMembers: (count: number) => `${new Intl.NumberFormat('en-US').format(count)} active ${count === 1 ? 'member' : 'members'}`,
    actionsFor: (name: string) => `Actions for ${name}`, editDepartment: (name: string) => `Edit ${name}`,
    settingsDescription: "Set the department's identity and optional instructions. Blank overrides use the applicable organization or system default.",
    name: 'Name', code: 'Code', description: 'Description',
    billingContactEmail: 'Billing contact email', notificationEmail: 'Notification email',
    shippingInstructions: 'Shipping instructions', resultDeliveryInstructions: 'Result delivery instructions',
    purchaseOrderRule: 'Purchase order rule', inheritPo: 'Use organization or system default',
    required: 'Required', optional: 'Not required',
    nameRequired: 'Enter a department name.', codeRequired: 'Enter a department code.',
    validEmail: 'Enter a valid email address.', tooLong: (limit: number) => `Use ${limit} characters or fewer.`,
    cancel: 'Cancel', done: 'Done', save: 'Save changes', saving: 'Saving…',
    discardQuestion: 'Discard your unsaved department changes?', discard: 'Discard changes', keepEditing: 'Keep editing',
    conflict: 'The department changed. Its latest version is loaded and your entries are preserved. Review them before saving again.',
    conflictLoadFailed: 'The department changed, but its latest version could not be loaded. Your entries are preserved. Check your connection, then try again.',
    reopenAction: 'Reopen the action to review the latest department.',
    changeDefault: 'Change default department', deactivateDepartment: 'Deactivate department', reactivateDepartment: 'Reactivate department',
    defaultConsequence: 'New default selections will use this department. Existing records and memberships keep their department.',
    deactivateConsequence: 'Users will lose access to this department. Assign active members to another department first. Existing records are retained.',
    reactivateConsequence: 'The department becomes available again. User assignments must be reviewed and restored explicitly.',
    confirmChange: 'Confirm change', membersTitle: (name: string) => `${name} members`,
    membersDescription: 'Manage access within this department. Organization administrators retain access to every department.',
    loadingMembers: 'Loading department members…', noMembers: 'No active members are assigned to this department.',
    lookupLabel: 'Existing organization member email',
    lookupDescription: 'Enter the exact email of an active organization member. An organization administrator must invite anyone who does not yet have Portal access.',
    lookup: 'Find member', lookingUp: 'Finding…',
    noCandidate: 'No active organization member matches that email. Ask an organization administrator to review their access.',
    allDepartments: 'Organization administrator · All departments',
    addAccess: 'Add access', removeAccess: 'Remove access', member: 'Member', departmentAdmin: 'Department administrator',
    makeAdmin: 'Make department admin', makeMember: 'Make member', alreadyAssigned: 'Already assigned to this department',
    confirmAccess: (name: string, active: boolean, admin: boolean) => `${active ? admin ? 'Grant department administrator access to' : 'Set department member access for' : 'Remove department access from'} ${name}?`,
    cancelChange: 'Cancel change', confirmAccessChange: 'Confirm access change',
    membershipConflict: 'Access changed. The latest assignments are loaded. Review them and choose the action again.',
    pageTitle: (name: string) => `Departments for ${name}`, unavailable: 'Department administration unavailable',
    unavailableDescription: 'You need organization or department administrator access in the active organization.',
    inviteTitle: 'Add organization user',
    inviteDescription: 'Portal access begins only after the recipient accepts the invitation. Review their organization role and department access before sending.',
    firstName: 'First name', lastName: 'Last name', email: 'Email', role: 'Role',
    firstNameRequired: 'Enter a first name.', lastNameRequired: 'Enter a last name.',
    organizationAdmin: 'Organization administrator',
    organizationAdminDescription: 'Organization administrators can access and manage every department, including departments added later.',
    invitationDepartments: 'Department access', selectDepartments: 'Select at least one department before sending the invitation.',
    defaultDepartment: (name: string) => `${name} (default)`, departmentAdminFor: (name: string) => `Department administrator for ${name}`,
    noInviteDepartments: 'No active departments are available. Review organization setup before inviting a user.',
    retry: 'Retry', sendInvitation: 'Send invitation', sending: 'Sending…', invitationError: 'Invitation was not sent',
    discardInvitation: 'Discard this unsent invitation?',
    reviewChangedDepartments: 'Department availability changed. Your entries are preserved. Review access before sending again.',
    requestFailed: 'The request could not be completed. Check your connection and try again.',
    accessDenied: 'Your access changed or this action is not permitted. Refresh the page and review your administrator access.',
    invalidSettings: 'The change could not be saved. Review the fields and the latest department or membership state, then try again.',
  },
} as const

export const departmentMessages = departmentMessagesByLocale['en-US']

export function departmentErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    if (error.response?.status === 403 || error.response?.status === 401) return departmentMessages.accessDenied
    if (error.response?.status === 409) return departmentMessages.membershipConflict
    if (error.response?.status === 400) return departmentMessages.invalidSettings
    return departmentMessages.requestFailed
  }
  return error instanceof Error ? error.message : departmentMessages.requestFailed
}
