import type { enUSPageContent } from './en-US'

type LocalizedValue<T> =
  T extends string ? string
    : T extends number ? number
      : T extends boolean ? boolean
        : T extends readonly (infer Item)[] ? readonly LocalizedValue<Item>[]
          : T extends object ? { readonly [Key in keyof T]: LocalizedValue<T[Key]> }
            : T

export type WebsitePageCatalog = LocalizedValue<typeof enUSPageContent>
