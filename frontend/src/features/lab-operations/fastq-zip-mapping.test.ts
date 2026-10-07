import { expect, it } from 'vitest'
import type { FastqArchive, FastqSet } from '#/api/lab-fastq'
import { restoreZipMappings } from './fastq-zip-mapping'

const archive: FastqArchive = { id: 'zip', fileName: 'batch.zip', sizeBytes: 100, expiresAtUtc: '2100-01-01', chunkBytes: 4, receivedBytes: 100, inspected: true,
  entries: [{ index: 0, fullName: 'LIB-1/vendor_R1.fastq', fileName: 'vendor_R1.fastq', sizeBytes: 20, isFastq: true }, { index: 1, fullName: 'report.txt', fileName: 'report.txt', sizeBytes: 10, isFastq: false }] }
const hints = [{ id: 'member', libraryKey: 'LIB-1' }]
it('reselecting the same ZIP preserves reviewed attribution and retry identity', () => {
  const rows = restoreZipMappings(archive, '', [], [], hints)
  rows[0] = { ...rows[0], group: '3', part: '2', description: 'actual flowcell/lane', memberId: 'chosen-member' }
  expect(restoreZipMappings(archive, archive.id, rows, [], hints)).toEqual(rows)
})
it('restores completed imports from server receipts after switching ZIPs', () => {
  const set: FastqSet = { id: 'set', memberId: 'member', sequencingRunNumber: 2, libraryPreparationChoice: 'ExistingLibrary', readLayout: 'PairedEnd', setVersion: 1, sealedSet: false,
    files: [{ id: 'original-command', originalFileName: 'vendor_R1.fastq', fileName: 'canonical.fastq', groupNumber: 3, readNumber: 1, partNumber: 2, groupDescription: 'actual lane', sizeBytes: 20, readCount: 1, fileId: 'file', expiresAtUtc: '2100-01-01', chunkBytes: 4, receivedBytes: 20, archiveId: 'zip', archiveEntryIndex: 0 }] }
  const [row] = restoreZipMappings(archive, 'another-zip', [], [set], hints)
  expect(row).toMatchObject({ uploadId: 'original-command', memberId: 'member', group: '3', part: '2', description: 'actual lane' })
})
it('preserves explicit exclusions when a ZIP is selected again', () => {
  const rows = restoreZipMappings(archive, '', [], [], hints)
  rows[0] = { ...rows[0], excluded: true, exclusionReason: 'Vendor duplicate' }
  expect(restoreZipMappings(archive, archive.id, rows, [], hints)[0]).toMatchObject({ excluded: true, exclusionReason: 'Vendor duplicate', uploadId: rows[0].uploadId })
})
it('requires review for ambiguous filename matches and does not import report entries', () => {
  const rows = restoreZipMappings(archive, '', [], [], [...hints, { id: 'other', libraryKey: 'LIB-1' }])
  expect(rows).toHaveLength(1); expect(rows[0].memberId).toBe('')
})
