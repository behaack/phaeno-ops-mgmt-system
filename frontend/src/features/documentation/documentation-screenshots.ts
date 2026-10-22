import metadata from './documentation-capture-metadata.json'

export type DocumentationScreenshotMetadata = { width: number; height: number; points: readonly { number: number; x: number; y: number }[] }

// Actual component captures with fictional records. Portable prose stays in MDX.
export const documentationScreenshots: Readonly<Partial<Record<string, DocumentationScreenshotMetadata>>> = metadata
