import type { FastqArchive, FastqSet } from '#/api/lab-fastq'
import type { VendorResultsValues } from './VendorResultsWorkspacePage'

type Hint = { id: string; libraryKey: string; sequencingTube?: { barcode: string } | null }

export function restoreZipMappings(archive: FastqArchive, selectedArchiveId: string, rows: VendorResultsValues['zipRows'], sets: FastqSet[], hints: Hint[]): VendorResultsValues['zipRows'] {
  return (archive.entries ?? []).filter(e => e.isFastq).map(entry => {
    const saved = selectedArchiveId === archive.id ? rows.find(r => r.index === entry.index) : undefined
    if (saved) return { ...saved }
    const importedSet = sets.find(s => s.files.some(f => f.archiveId === archive.id && f.archiveEntryIndex === entry.index))
    const imported = importedSet?.files.find(f => f.archiveId === archive.id && f.archiveEntryIndex === entry.index)
    if (imported && importedSet) return { index: entry.index, memberId: importedSet.memberId, read: String(imported.readNumber), group: String(imported.groupNumber), part: String(imported.partNumber), description: imported.groupDescription, excluded: false, exclusionReason: '', uploadId: imported.id }
    const matches = hints.filter(t => entry.fullName.toUpperCase().includes(t.libraryKey.toUpperCase())
      || Boolean(t.sequencingTube?.barcode && entry.fullName.toUpperCase().includes(t.sequencingTube.barcode.toUpperCase())))
    return { index: entry.index, memberId: matches.length === 1 ? matches[0].id : '', read: /(?:^|[_\-.])R([12])(?:[_\-.]|$)/i.exec(entry.fileName)?.[1] ?? '', group: '1', part: '1', description: '', excluded: false, exclusionReason: '', uploadId: crypto.randomUUID() }
  })
}
