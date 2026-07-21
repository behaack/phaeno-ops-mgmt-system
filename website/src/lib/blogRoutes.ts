export const BLOG_INDEX_PATH = '/media/blog';
export const BLOG_FEED_PATH = '/blog.xml';

export function getBlogPostPath(slug: string) {
  return `${BLOG_INDEX_PATH}/${slug}`;
}

export function getBlogPostFeedPath(slug: string) {
  return `${getBlogPostPath(slug)}/`;
}
