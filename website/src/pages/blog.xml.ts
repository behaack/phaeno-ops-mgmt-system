import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getPageCatalog } from '@/i18n/pageCatalogs';
import { getBlogEntrySlug, getBlogPostFeedPath, isBlogTranslationVisible } from '@/lib/blogRoutes';

export async function GET(context: any) {
  const posts = (await getCollection('blog')).filter((post) => (
    post.data.locale === 'en-US'
    && isBlogTranslationVisible('en-US', post.data.translationStatus)
  ));
  const content = getPageCatalog('en-US').blog;
  return rss({
    title: content.feedTitle,
    description: content.feedDescription,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.date,
      link: getBlogPostFeedPath(getBlogEntrySlug(post.id)),
    })),
    customData: `<language>en-us</language>`,
  });
}
