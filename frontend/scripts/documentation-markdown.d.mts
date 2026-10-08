export function plainText(node: unknown): string
export function documentationMarkdown(options?: { collect?: (sections: Array<{ heading: string; anchor: string; text: string }>) => void }): (tree: unknown) => void
