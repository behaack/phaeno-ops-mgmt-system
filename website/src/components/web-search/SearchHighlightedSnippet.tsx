import type { JSX } from "react";
import { createSearchTermRegex } from './searchText';

export interface ISearchResult {
  text: string;
  searchStr: string;
}

function SearchHighlightedSnippet({ text, searchStr }: ISearchResult) {
  const markerRegex = /\{\{(.*?)\}\}/g;
  const literalRegex = createSearchTermRegex(searchStr);
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
      const matchStart = literalMatch.index + literalMatch[1].length;
      const matchEnd = matchStart + literalMatch[2].length;

      if (matchStart > literalIndex) {
        parts.push(value.slice(literalIndex, matchStart));
      }
      parts.push(
        <mark key={`literal-${partKey++}`} className="web-search-highlight">
          {literalMatch[2]}
        </mark>,
      );
      literalIndex = matchEnd;
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
