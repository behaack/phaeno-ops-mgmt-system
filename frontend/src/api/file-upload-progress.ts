export type FileUploadProgress = {
  fileName: string
  phase: 'checking' | 'uploading' | 'verifying' | 'extracting' | 'complete'
  transferredBytes: number
  totalBytes: number
  percentage?: number
  message: string
  completedItems?: number
  totalItems?: number
}
export type FileUploadProgressCallback = (progress: FileUploadProgress) => void

export function reportUpload(onProgress: FileUploadProgressCallback | undefined, file: File,
  phase: FileUploadProgress['phase'], transferredBytes: number, message: string, percentage?: number) {
  onProgress?.({ fileName: file.name, phase, transferredBytes: Math.min(file.size, transferredBytes), totalBytes: file.size, message, percentage })
}
