import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getBlogPostFeedPath } from '@/lib/blogRoutes';

export async function GET(context: any) {
  const posts = await getCollection('blog');
  return rss({
    title: 'Phaeno – Latest updates',
    description: 'Insights on RNA-sequencing and our PSeq platform',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.date,
      link: getBlogPostFeedPath(post.id),
    })),
    customData: `<language>en-us</language>`,
  });
}
