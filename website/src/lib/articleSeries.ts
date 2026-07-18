export interface ArticleSeriesPart {
  number: number;
  title: string;
  href: string;
}

export interface ArticleSeries {
  title: string;
  parts: ArticleSeriesPart[];
}

export const phasedSequencingSeries: ArticleSeries = {
  title: 'An Introduction to Phased Sequencing',
  parts: [
    {
      number: 1,
      title: 'Why RNA Needs Better Measurement',
      href: '/blog/an-introduction-to-phased-sequencing-part-1',
    },
    {
      number: 2,
      title: 'Preserving Source-Molecule Identity',
      href: '/blog/an-introduction-to-phased-sequencing-part-2',
    },
    {
      number: 3,
      title: 'From Molecular Resolution to Biological Insight',
      href: '/blog/an-introduction-to-phased-sequencing-part-3',
    },
  ],
};
