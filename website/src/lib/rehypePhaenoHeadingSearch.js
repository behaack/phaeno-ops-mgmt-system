function getNodeText(node) {
  if (node.type === 'text')
    return node.value;

  if (!node.children)
    return '';

  return node.children.map(getNodeText).join('');
}

function slugifyHeading(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function rehypePhaenoHeadingSearch() {
  return (tree) => {
    const seen = new Map();

    function visit(node) {
      if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
        const title = getNodeText(node).trim();
        if (title) {
          const baseSlug = slugifyHeading(title);
          const count = seen.get(baseSlug) ?? 0;
          seen.set(baseSlug, count + 1);

          node.properties = {
            ...node.properties,
            id: node.properties?.id ?? (count === 0 ? baseSlug : `${baseSlug}-${count}`),
            'data-phaeno-search': node.properties?.['data-phaeno-search'] ?? title,
          };
        }
      }

      node.children?.forEach(visit);
    }

    visit(tree);
  };
}
