const searchTermPattern = /[\p{L}\p{N}_']+/gu;

export function getSearchTerms(searchText: string) {
  const terms = searchText.match(searchTermPattern) ?? [];
  const uniqueTerms = new Map<string, string>();

  for (const term of terms) {
    const key = normalizeSearchText(term);
    if (key && !uniqueTerms.has(key)) {
      uniqueTerms.set(key, term);
    }
  }

  return Array.from(uniqueTerms.values())
    .sort((left, right) => right.length - left.length);
}

export function hasVisibleSearchMatch(
  searchText: string,
  visibleValues: Array<string | undefined>,
) {
  const terms = getSearchTerms(searchText)
    .map(normalizeSearchText)
    .filter(Boolean);
  if (terms.length === 0) {
    return false;
  }

  const visibleText = normalizeSearchText(visibleValues.join(' '));
  return terms.every((term) => visibleText.includes(term));
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase();
}
