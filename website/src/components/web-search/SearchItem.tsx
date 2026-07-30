import type { articletypes, webtypes } from '@/assets/docTypes';
import { useMemo } from 'react';
import { FaFileLines, FaGlobe, FaNewspaper } from 'react-icons/fa6';
import SearchHighlightedSnippet from './SearchHighlightedSnippet';
import { hasDistinctSearchSnippet } from './searchText';

export interface ISearchItem {
  id: string;
  url: string;
  pageTitle: string;
  pageDisplayTitle?: string;
  anchor: string;
  anchorTitle: string;
  description: string;
  documentType: webtypes | articletypes;
  snippet: string;
  count: number;
  score: number;
  matchedInDocumentSource?: boolean;
}

export interface IProps {
  list: ISearchItem[];
  index: number;
  item: ISearchItem;
  searchStr: string;
  active: boolean;
  linkRef: (node: HTMLAnchorElement | null) => void;
  optionId: string;
  onSelect: () => void;
  onFocusOption: (index: number) => void;
}

const productionWebsiteHosts = new Set([
  'www.phaenobiotech.com',
  'phaenobiotech.com',
]);

function resolveSearchResultUrl(url: string) {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return url;
  }

  try {
    const parsed = new URL(url, window.location.origin);
    if (!productionWebsiteHosts.has(parsed.hostname.toLowerCase())) {
      return url;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

function getPageDisplayTitle(item: Pick<ISearchItem, 'pageTitle' | 'pageDisplayTitle'>) {
  return item.pageDisplayTitle?.trim() || item.pageTitle;
}

const documentPresentations = {
  'White Paper': {
    icon: FaFileLines,
    label: 'White Paper',
    titlePrefixes: ['White Paper', 'Paper'],
  },
  'Blog Post': {
    icon: FaNewspaper,
    label: 'Blog',
    titlePrefixes: ['Blog Post', 'Blog'],
  },
  'Web Page': {
    icon: FaGlobe,
    label: 'Web Page',
    titlePrefixes: ['Web Page'],
  },
} as const;

function getDocumentPresentation(documentType: ISearchItem['documentType']) {
  return documentPresentations[documentType as keyof typeof documentPresentations];
}

function removeDocumentTypePrefix(title: string, prefixes: readonly string[]) {
  const matchingPrefix = prefixes.find((prefix) => {
    const remainder = title.slice(prefix.length);
    return title.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase())
      && /^\s*[-–—:]\s*/.test(remainder);
  });

  if (!matchingPrefix) return title;
  return title.slice(matchingPrefix.length).replace(/^\s*[-–—:]\s*/, '').trim();
}

function getSamePageHashTarget(url: string) {
  if (typeof window === 'undefined') return null;

  try {
    const parsed = new URL(url, window.location.href);
    const current = new URL(window.location.href);
    if (
      parsed.origin !== current.origin ||
      parsed.pathname !== current.pathname ||
      parsed.search !== current.search ||
      !parsed.hash
    ) {
      return null;
    }

    return parsed.hash;
  } catch {
    return null;
  }
}

function scrollToHashTarget(hash: string) {
  const target = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!target) {
    window.location.hash = hash;
    return;
  }

  const header = document.getElementById('site-header') as HTMLElement | null;
  const offset = header?.offsetHeight ?? 80;
  const top = target.getBoundingClientRect().top + window.scrollY - offset - 24;

  history.pushState(null, '', hash);
  header?.classList.remove('hidden');
  header?.classList.add('visible');
  window.scrollTo({ top, behavior: 'smooth' });
}

export default function SearchItem({ 
  list, 
  index, 
  item, 
  searchStr, 
  active, 
  linkRef, 
  optionId, 
  onSelect,
  onFocusOption
}: IProps ) {
  const targetUrl = useMemo(() => resolveSearchResultUrl(item.url), [item.url]);
  const pageDisplayTitle = useMemo(() => getPageDisplayTitle(item), [item.pageDisplayTitle, item.pageTitle]);
  const documentPresentation = useMemo(
    () => getDocumentPresentation(item.documentType),
    [item.documentType],
  );
  const groupDisplayTitle = useMemo(
    () => documentPresentation
      ? removeDocumentTypePrefix(pageDisplayTitle, documentPresentation.titlePrefixes)
      : pageDisplayTitle,
    [documentPresentation, pageDisplayTitle],
  );
  const DocumentIcon = documentPresentation?.icon;
  const showSnippet = useMemo(
    () => hasDistinctSearchSnippet(item.anchorTitle, item.snippet),
    [item.anchorTitle, item.snippet],
  );

  const isHeader = useMemo(() => {
    if (index === 0) return true;
    return getPageDisplayTitle(list[index - 1]) !== getPageDisplayTitle(list[index]);
  }, [index, list]);

  const pageSummary = useMemo(() => {
    const pageItems = list.filter((result) => getPageDisplayTitle(result) === pageDisplayTitle);
    const matches = pageItems.reduce((total, result) => total + result.count, 0);
    return {
      results: pageItems.length,
      matches,
    };
  }, [pageDisplayTitle, list]);

  const header = useMemo(() => (
    <li role="presentation" aria-hidden="true" className="web-search-group">
      <div className="web-search-group-content">
        <div className="web-search-group-heading">
          <h3 className="web-search-group-title">
            {DocumentIcon && documentPresentation && (
              <>
                <DocumentIcon className="web-search-group-icon" aria-hidden="true" focusable="false" />
                <span className="web-search-group-type">{documentPresentation.label}</span>
                <span className="web-search-group-separator" aria-hidden="true">—</span>
              </>
            )}
            <span className="web-search-group-name">
              <SearchHighlightedSnippet text={groupDisplayTitle} searchStr={searchStr} />
            </span>
          </h3>
        </div>
        <span className="web-search-group-meta">
          {pageSummary.results} {pageSummary.results === 1 ? 'result' : 'results'}, {pageSummary.matches} {pageSummary.matches === 1 ? 'match' : 'matches'}
        </span>
      </div>
    </li>
  ), [DocumentIcon, documentPresentation, groupDisplayTitle, pageSummary, searchStr]);

  const link = useMemo(() => (
    <li
      role="presentation"
      className={`web-search-item ${active ? 'web-search-item-active' : ''}`}
    >
      <a
        href={targetUrl}
        ref={linkRef}
        className="web-search-link"
        role="option"
        aria-selected={active}
        id={optionId}
        tabIndex={active ? 0 : -1}
        onFocus={() => onFocusOption(index)}
        onClick={(e) => { 
          e.preventDefault();
          const samePageHash = getSamePageHashTarget(targetUrl);
          onSelect();
          if (!samePageHash) {
            window.location.href = targetUrl;
            return;
          }

          window.setTimeout(() => {
            scrollToHashTarget(samePageHash);
          }, 0);
        }}
      >
        <div className="web-search-result">
          <div className="web-search-result-heading">
            <h4 className="web-search-result-title">
              <SearchHighlightedSnippet text={item.anchorTitle} searchStr={searchStr} />
            </h4>
            <span className="web-search-result-meta">
              {item.matchedInDocumentSource && (
                <span className="web-search-match-source">Match in linked PDF</span>
              )}
              <span className="web-search-match-count">
                {item.count} {(item.count === 1) ? 'match' : 'matches'}
              </span>
            </span>
          </div>
          {showSnippet && (
            <p className="web-search-snippet">
              <SearchHighlightedSnippet text={item.snippet} searchStr={searchStr} />
            </p>
          )}
        </div>
      </a>
    </li>
  ), [item, targetUrl, searchStr, active, linkRef, optionId, onFocusOption, onSelect, showSnippet]);

  return (
    <>
      {isHeader && header}
      {link}
    </>
  );
}
