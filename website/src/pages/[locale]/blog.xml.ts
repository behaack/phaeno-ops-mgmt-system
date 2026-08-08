import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import {
  enabledLocales,
  getLocaleDefinition,
  type LocalizedLocale,
} from '@/i18n/locales';
import { getPageCatalog } from '@/i18n/pageCatalogs';
import {
  getBlogEntrySlug,
  getLocalizedBlogPostPath,
  isBlogTranslationVisible,
} from '@/lib/blogRoutes';

export function getStaticPaths() {
  return enabledLocales
    .filter((locale): locale is LocalizedLocale => locale !== 'en-US')
    .map((locale) => ({
      params: { locale: getLocaleDefinition(locale).prefix.replace(/^\//, '') },
      props: { locale },
    }));
}

export async function GET(context: { props: { locale: LocalizedLocale }, site: URL }) {
  const { locale } = context.props;
  const posts = (await getCollection('blog')).filter((post) => (
    post.data.locale === locale
    && isBlogTranslationVisible(locale, post.data.translationStatus)
  ));
  const content = getPageCatalog(locale).blog;

  return rss({
    title: content.feedTitle,
    description: content.feedDescription,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.date,
      link: `${getLocalizedBlogPostPath(locale, getBlogEntrySlug(post.id))}/`,
    })),
    customData: `<language>${locale}</language>`,
  });
}
