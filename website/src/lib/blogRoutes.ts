import { prefixPathForLocale, type SupportedLocale } from '@/i18n/locales';
import { isWebsiteReviewMode } from '@/lib/reviewMode';

export const BLOG_INDEX_PATH = '/media/blog';
export const BLOG_FEED_PATH = '/blog.xml';

type BlogTranslationStatus = 'not_started' | 'draft' | 'review' | 'published' | 'stale' | 'withdrawn';

export function isBlogTranslationVisible(
  locale: SupportedLocale,
  status: BlogTranslationStatus,
) {
  if (status === 'published') return true;
  return locale !== 'en-US'
    && isWebsiteReviewMode
    && status !== 'not_started'
    && status !== 'withdrawn';
}

export function getBlogEntrySlug(entryId: string) {
  return entryId.split('/').filter(Boolean).at(-1) ?? entryId;
}

export function getBlogPostPath(slug: string) {
  return `${BLOG_INDEX_PATH}/${slug}`;
}

export function getBlogPostFeedPath(slug: string) {
  return `${getBlogPostPath(slug)}/`;
}

export function getLocalizedBlogPostPath(locale: SupportedLocale, slug: string) {
  return prefixPathForLocale(locale, getBlogPostPath(slug));
}

export function getLocalizedBlogFeedPath(locale: SupportedLocale) {
  return prefixPathForLocale(locale, BLOG_FEED_PATH);
}
