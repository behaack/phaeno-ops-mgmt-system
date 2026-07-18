import type { JSX } from "react";

export interface ISearchResult {
  text: string;
  searchStr: string; // this can be ignored or used to style matches
}

function SearchHighlightedSnippet({ text }: ISearchResult) {
  const regex = /\{\{(.*?)\}\}/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Push text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Push highlighted match
    parts.push(
      <mark key={match.index} className="web-search-highlight">
        {match[1]}
      </mark>
    );

    lastIndex = regex.lastIndex;
  }

  // Push the remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className="w-full">{parts}</span>;
}

export default SearchHighlightedSnippet;
