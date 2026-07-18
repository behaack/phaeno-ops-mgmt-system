import type { articletypes, webtypes } from '@/assets/docTypes';
import { useMemo } from 'react';
import SearchHighlightedSnippet from './SearchHighlightedSnippet';

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
          <h3 className="web-search-group-title">{pageDisplayTitle}</h3>
        </div>
        <span className="web-search-group-meta">
          {pageSummary.results} {pageSummary.results === 1 ? 'result' : 'results'}, {pageSummary.matches} {pageSummary.matches === 1 ? 'match' : 'matches'}
        </span>
      </div>
    </li>
  ), [pageDisplayTitle, pageSummary]);

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
            <h4 className="web-search-result-title">{item.anchorTitle}</h4>
            <span className="web-search-match-count">
              {item.count} {(item.count === 1) ? 'match' : 'matches'}
            </span>
          </div>
          <p className="web-search-snippet">
            <SearchHighlightedSnippet text={item.snippet} searchStr={searchStr} />
          </p>
        </div>
      </a>
    </li>
  ), [item, targetUrl, searchStr, active, linkRef, optionId, onFocusOption, onSelect]);

  return (
    <>
      {isHeader && header}
      {link}
    </>
  );
}
