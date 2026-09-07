/** Keeps a creation attempt stable until its saved record is known. */
export class ResumableDraft<Input, Record> {
  record: Record | null = null
  private pending: { input: Input; key: string } | null = null

  async getOrCreate(input: Input, create: (input: Input, key: string) => Promise<Record>): Promise<Record> {
    if (this.record) return this.record
    this.pending ??= { input: structuredClone(input), key: crypto.randomUUID() }
    this.record = await create(this.pending.input, this.pending.key)
    this.pending = null
    return this.record
  }
}
