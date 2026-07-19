import type { JSX } from "react";
import { getSearchTerms } from './searchText';

export interface ISearchResult {
  text: string;
  searchStr: string;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function SearchHighlightedSnippet({ text, searchStr }: ISearchResult) {
  const markerRegex = /\{\{(.*?)\}\}/g;
  const searchTerms = getSearchTerms(searchStr);
  const literalRegex = searchTerms.length > 0
    ? new RegExp(searchTerms.map(escapeRegex).join('|'), 'gi')
    : null;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let partKey = 0;

  const pushLiteralMatches = (value: string) => {
    if (!literalRegex) {
      if (value) parts.push(value);
      return;
    }

    literalRegex.lastIndex = 0;
    let literalIndex = 0;
    let literalMatch: RegExpExecArray | null;
    while ((literalMatch = literalRegex.exec(value)) !== null) {
      if (literalMatch.index > literalIndex) {
        parts.push(value.slice(literalIndex, literalMatch.index));
      }
      parts.push(
        <mark key={`literal-${partKey++}`} className="web-search-highlight">
          {literalMatch[0]}
        </mark>,
      );
      literalIndex = literalRegex.lastIndex;
    }

    if (literalIndex < value.length) {
      parts.push(value.slice(literalIndex));
    }
  };

  let markerMatch: RegExpExecArray | null;
  while ((markerMatch = markerRegex.exec(text)) !== null) {
    pushLiteralMatches(text.slice(lastIndex, markerMatch.index));
    parts.push(
      <mark key={`marker-${partKey++}`} className="web-search-highlight">
        {markerMatch[1]}
      </mark>,
    );
    lastIndex = markerRegex.lastIndex;
  }

  pushLiteralMatches(text.slice(lastIndex));

  return <span className="w-full">{parts}</span>;
}

export default SearchHighlightedSnippet;
