import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context: any) {
  const posts = await getCollection('press');
  return rss({
    title: 'Phaeno – Latest updates',
    description: 'Press Releases on Phaeno and our PSeq platform',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.date,
      link: `/media/press-releases/${post.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
