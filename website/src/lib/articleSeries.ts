import type { SupportedLocale } from '@/i18n/locales';
import { getLocalizedBlogPostPath } from './blogRoutes';

export interface ArticleSeriesPart {
  number: number;
  title: string;
  href: string;
}

export interface ArticleSeries {
  id: 'phased-sequencing';
  title: string;
  parts: ArticleSeriesPart[];
}

const phasedSequencingTitles: Record<SupportedLocale, {
  series: string;
  parts: [string, string, string];
}> = {
  'en-US': {
    series: 'An Introduction to Phased Sequencing',
    parts: ['Why RNA Needs Better Measurement', 'Preserving Source-Molecule Identity', 'From Molecular Resolution to Biological Insight'],
  },
  ar: {
    series: 'مقدمة في التسلسل المرحلي',
    parts: ['لماذا يحتاج الرنا إلى قياس أفضل', 'الحفاظ على هوية الجزيء المصدر', 'من الدقة الجزيئية إلى الرؤية البيولوجية'],
  },
  fr: {
    series: 'Introduction au séquençage phasé',
    parts: ['Pourquoi l’ARN nécessite une meilleure mesure', 'Préserver l’identité de la molécule source', 'De la résolution moléculaire aux connaissances biologiques'],
  },
  es: {
    series: 'Introducción a la secuenciación por fases',
    parts: ['Por qué el ARN necesita una mejor medición', 'Preservar la identidad de la molécula de origen', 'De la resolución molecular al conocimiento biológico'],
  },
  'zh-Hans': {
    series: '分阶段测序简介',
    parts: ['为什么 RNA 需要更好的测量', '保留源分子身份', '从分子分辨率到生物学洞见'],
  },
  ja: {
    series: 'フェーズドシーケンシング入門',
    parts: ['RNA により優れた測定が必要な理由', '元分子の同一性を保持する', '分子分解能から生物学的洞察へ'],
  },
  'de-DE': {
    series: 'Einführung in die Phasensequenzierung',
    parts: ['Warum RNA besser gemessen werden muss', 'Die Identität des Ursprungsmoleküls bewahren', 'Von molekularer Auflösung zu biologischer Erkenntnis'],
  },
  it: {
    series: 'Introduzione al sequenziamento fasico',
    parts: ['Perché l’RNA richiede una misurazione migliore', 'Preservare l’identità della molecola sorgente', 'Dalla risoluzione molecolare alla comprensione biologica'],
  },
};

export function getPhasedSequencingSeries(locale: SupportedLocale = 'en-US'): ArticleSeries {
  const titles = phasedSequencingTitles[locale];
  return {
    id: 'phased-sequencing',
    title: titles.series,
    parts: titles.parts.map((title, index) => ({
      number: index + 1,
      title,
      href: getLocalizedBlogPostPath(locale, `an-introduction-to-phased-sequencing-part-${index + 1}`),
    })),
  };
}

export const phasedSequencingSeries = getPhasedSequencingSeries();
