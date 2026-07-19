const searchTermPattern = /[\p{L}\p{N}_']+/gu;
const searchTokenCharacterClass = "\\p{L}\\p{N}_'";
const highlightedTermPattern = /\{\{(.*?)\}\}/g;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

export function createSearchTermRegex(searchText: string, flags = 'giu') {
  const terms = getSearchTerms(searchText);
  if (terms.length === 0) {
    return null;
  }

  return new RegExp(
    `(^|[^${searchTokenCharacterClass}])(${terms.map(escapeRegex).join('|')})(?=$|[^${searchTokenCharacterClass}])`,
    flags,
  );
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
  const unmatchedTerms = terms.filter((term) =>
    createSearchTermRegex(term, 'iu')?.test(visibleText) !== true);
  if (unmatchedTerms.length === 0) {
    return true;
  }

  const highlightedTokens = new Set(
    visibleValues.flatMap((value) =>
      Array.from(value?.matchAll(highlightedTermPattern) ?? [])
        .map((match) => normalizeSearchText(match[1]))
        .filter(Boolean)),
  );

  return highlightedTokens.size >= unmatchedTerms.length;
}

export function hasDistinctSearchSnippet(title: string, snippet: string) {
  const normalizedSnippet = normalizeDisplayedSearchText(snippet);

  return normalizedSnippet.length > 0
    && normalizedSnippet !== normalizeDisplayedSearchText(title);
}

function normalizeDisplayedSearchText(value: string) {
  return normalizeSearchText(
    value
      .replace(highlightedTermPattern, '$1')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase();
}
