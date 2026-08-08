import { localizedRoutePairs } from './routes'
import type { LocalizedPublicationInput, LocalizedPublicationPage } from './publicationTypes'

function defineArabicPage(input: LocalizedPublicationInput): LocalizedPublicationPage {
  const route = localizedRoutePairs.find((candidate) => candidate.translationKey === input.translationKey)
  if (!route) throw new Error(`Missing route pair for Arabic page ${input.translationKey}.`)

  return {
    ...input,
    sourceLocale: 'en-US',
    sourceRevision: '2026-08-07',
    translationStatus: 'draft',
    route,
  }
}

export const arabicWhitePapers: LocalizedPublicationPage[] = [
  defineArabicPage({
    translationKey: 'white-paper.platform-overview',
    kind: 'white-paper',
    title: 'PSeq: تسلسل مرحلي للرنا على مستوى الجزيء باستخدام منصات NGS القياسية',
    metaTitle: 'PSeq: تسلسل الرنا على مستوى الجزيء | Phaeno',
    description: 'تجمع PSeq بين وسم جزيء المصدر وNGS المزدوج وإعادة بناء النسخ آليًا وسجلات SQL خاصة بكل تشغيل لتحليل الرنا القابل للتتبّع.',
    eyebrow: 'ورقة Phaeno البيضاء',
    lead: 'تعرض هذه الورقة المشكلة الأساسية للمنصة وبنيتها ونموذج تشغيلها، دون وصف وصفات الكواشف أو نتائج التحقق التفصيلية.',
    sections: [
      { heading: 'الملخص', paragraphs: ['PSeq منصة لتسلسل الرنا مخصصة للاستخدام البحثي، تنقل دقة الجزيء الكامل والربط المرحلي من البداية إلى النهاية إلى تسلسل الجيل التالي القياسي قصير القراءة (NGS). أثناء النسخ العكسي، يوسم كاشف خاص جزيء مصدر كل تسلسل رنا، وتحفظ استراتيجية المكتبة علامة الوسم عبر الشظايا العشوائية. يعمل التسلسل المزدوج على أجهزة غير معدلة، بينما يجمع مسار آلي القراءات حسب معرّف جزيء المصدر (SMID)، ويحدد الجين المصدر، ويبني تسلسلًا متوافقًا عليه، ويحتفظ بالسجلات الداعمة في قاعدة بيانات SQL خاصة بكل تشغيل.', 'تعرض هذه الورقة المشكلة الأساسية للمنصة وبنيتها ونموذج تشغيلها. ولا تتضمن وصفات تشغيل الكواشف أو نتائج التحقق التفصيلية، إذ تغطيها الأوراق المرافقة.'] },
      { heading: 'الموضوعات الرئيسية', bullets: ['إثبات هوية جزيء المصدر قبل التجزئة', 'التجميع حسب SMID وإعادة بناء النسخة', 'تكامل الوسم الجزيئي والتجميع الآلي وسجلات SQL', 'التشغيل على بنية NGS القياسية'] },
      { heading: 'المحتويات', bullets: ['مشكلة الربط في القراءة القصيرة', 'بنية الإشارة الواضحة ومبادئ تصميم PSeq', 'نموذج التشغيل من البداية إلى النهاية', 'ثلاثة مكونات مترابطة للمنصة', 'التحليل على مستوى الجزيء وقابلية تتبع الأدلة', 'نموذج النشر والمخرجات والحدود الحالية'] },
    ],
    whitePaper: {
      pdfPath: '/white-papers/pseq-technical-whitepaper-part-1-platform-overview.pdf', image: '/images/media/white-papers/pseq-technical-white-paper.png', date: '2026-07-31', pageCount: 7, version: '1.0',
      topics: ['تسلسل الرنا المرحلي على مستوى الجزيء', 'بنية منصة PSeq', 'وسم معرّف جزيء المصدر', 'سير عمل NGS قصير القراءة', 'نموذج بيانات رنا قابل للتتبّع'],
      searchKeywords: ['PSeq', 'تسلسل الرنا', 'SMID', 'NGS', 'إعادة بناء النسخ'],
    },
  }),
  defineArabicPage({
    translationKey: 'white-paper.molecular-tagging',
    kind: 'white-paper',
    title: 'الوسم الجزيئي وبنية مكتبة PSeq',
    metaTitle: 'الوسم الجزيئي وبنية مكتبة PSeq | Phaeno',
    description: 'مبادئ تصميم الحفاظ على هوية جزيء المصدر واتجاه السلسلة في مكتبات PSeq.',
    eyebrow: 'ورقة Phaeno البيضاء',
    lead: 'تصف الورقة التصميم الجزيئي وبنية القراءة المتوقعة لمكتبة PSeq، ولا تمثل وصفة كواشف أو تقرير تحقق.',
    sections: [
      { heading: 'الملخص', paragraphs: ['تتطلب إعادة بناء الجزيء الكامل من القراءات القصيرة أكثر من عمق التسلسل؛ إذ يجب أن تحتفظ الشظايا برابطة موثوقة مع الجزيء الذي نشأت منه. تعالج PSeq هذا الشرط بإدخال وسم متعدد الوظائف أثناء النسخ العكسي، ثم إعادة توزيع علامته بين الشظايا العشوائية الناتجة من cDNA الموسوم. تحمل العلامة معرّف جزيء مصدر عالي التنوع (SMID)، ومعالم تسلسلية ثابتة، ومعلومات اتجاه السلسلة يمكن التعرف عليها بعد التسلسل المزدوج.', 'تصف هذه الورقة التصميم الجزيئي وبنية القراءة المتوقعة لمكتبة PSeq. وهي وصف معماري، وليست وصفة كواشف أو تقرير تحقق. تبقى تركيبات العُدد التفصيلية وإجراءات التشغيل في إجراءات تشغيل قياسية محكومة، بينما تُجمع الأدلة التقنية للتحقق في الورقة الرابعة من هذه السلسلة.'] },
      { heading: 'هدف التصميم', paragraphs: ['تجزئة cDNA المصدر إلى مكتبة قراءة قصيرة تقليدية من دون فقد هوية جزيء الرنا الذي نشأت منه كل شظية أو اتجاه سلسلته.'] },
      { heading: 'الموضوعات الرئيسية', bullets: ['باركودات SMID عالية التنوع', 'مميّزات اتجاه السلسلة', 'التجزئة داخل الجزيء ونقل العلامة', 'بنية القراءة المزدوجة والواجهة بين الكيمياء ومسار البيانات'] },
      { heading: 'المحتويات', bullets: ['مشكلة حفظ الهوية', 'تشريح وسم PSeq', 'تصميم معرّف جزيء المصدر والغلاف وقاعدة التحقق واتجاه السلسلة', 'من وسم الرنا إلى مكتبة DNA مزدوجة لـ PSeq', 'عقد بنية قراءة التسلسل المتوقعة', 'متغيرات التصميم وواجهات المسار وحدود إجراءات التشغيل المحكومة'] },
    ],
    whitePaper: {
      pdfPath: '/white-papers/pseq-technical-whitepaper-part-2-molecular-tagging.pdf', image: '/images/media/white-papers/pseq-technical-white-paper.png', date: '2026-07-31', pageCount: 5, version: '1.0',
      topics: ['وسم جزيء المصدر', 'بنية باركود SMID', 'اتجاه السلسلة', 'بناء مكتبة PSeq', 'بنية القراءة المزدوجة'],
      searchKeywords: ['PSeq', 'الوسم الجزيئي', 'SMID', 'cDNA', 'التسلسل المزدوج'],
    },
  }),
  defineArabicPage({
    translationKey: 'white-paper.data-pipeline',
    kind: 'white-paper',
    title: 'مسار معالجة بيانات PSeq',
    metaTitle: 'مسار معالجة بيانات PSeq | Phaeno',
    description: 'بنية مكتبة DNA والتجميع الحاسوبي وقابلية تتبّع البيانات في مسار PSeq.',
    eyebrow: 'ورقة Phaeno البيضاء',
    lead: 'يحوّل المسار القراءات المزدوجة من مكتبة رنا موسومة إلى سجلات نسخ خاصة بكل جزيء، مع إبقاء الأدلة مرتبطة ببيانات FASTQ الأصلية.',
    sections: [
      { heading: 'الملخص', paragraphs: ['صُمم مسار بيانات PSeq لتحويل القراءات القصيرة المزدوجة من مكتبة رنا موسومة إلى سجلات نسخ خاصة بكل جزيء. يبدأ بتحديد موضع علامة PSeq واستعادة معرّف جزيء المصدر (SMID) وإشارة اتجاه السلسلة، ثم يجمع القراءات الناشئة من النسخة العكسية الموسومة نفسها. وداخل كل مجموعة جزيئية، يحدد المسار الجين المصدر ويستعيد تسلسله، ويجمع التسلسل، وينشئ نواتج المحاذاة، ويسجل سلسلة الأدلة في قاعدة بيانات SQL خاصة بالتشغيل.', 'تصف هذه الورقة البنية الحاسوبية ومنتجات البيانات ونموذج النشر واستراتيجية المصدر. ولا تعرض نتائج التحقق نفسها؛ إذ جُمعت الأدلة الأولية للمكتبة والمسار في الورقة الرابعة من هذه السلسلة.'] },
      { heading: 'الهدف الحاسوبي', paragraphs: ['تحويل مجموعة من القراءات القصيرة الموسومة إلى سجلات جزيئية يمكن فحص كل منها بصورة مستقلة، من دون فقد الصلة بالتسلسل الخام وأدلة الجودة.'] },
      { heading: 'الموضوعات الرئيسية', bullets: ['تحديد العلامة واستعادة SMID', 'تجميع القراءات حسب الجزيء', 'التجميع المرجعي ومن دون مرجع', 'إنشاء التسلسل المتوافق عليه', 'المصدر الجزيئي من FASTQ إلى السجل النهائي'] },
      { heading: 'المحتويات', bullets: ['نموذج المدخلات والمسار ذو المراحل العشر', 'تحليل العلامة وتشذيب القراءات وإزالة التكرار وتقسيم SMID', 'تحديد الجين المصدر وتجميع الجزيء', 'المحاذاة والتوافق ونواتج التحليل', 'طبقات سجلات SQL الخاصة بالتشغيل ومصدر الجزيئات', 'النشر وتقارير العملاء وواجهة التحقق'] },
    ],
    whitePaper: {
      pdfPath: '/white-papers/pseq-technical-whitepaper-part-3-data-pipeline.pdf', image: '/images/media/white-papers/pseq-technical-white-paper.png', date: '2026-07-31', pageCount: 7, version: '1.0',
      topics: ['تحليل علامة PSeq', 'تجميع القراءات حسب SMID', 'تحديد الجين المصدر', 'تجميع النسخ والتوافق', 'مصدر بيانات SQL'],
      searchKeywords: ['PSeq', 'FASTQ', 'SMID', 'مسار البيانات', 'تجميع الرنا', 'قابلية التتبّع'],
    },
  }),
  defineArabicPage({
    translationKey: 'white-paper.initial-validation',
    kind: 'white-paper',
    title: 'التحقق التقني الأولي لمنصة PSeq لتسلسل الرنا على مستوى الجزيء',
    metaTitle: 'التحقق التقني الأولي لمنصة PSeq | Phaeno',
    description: 'يدرس الدليل الأولي بنية المكتبة وموضع العلامة وتجميع النسخ حسب SMID وربط PRPF31 وقابلية التتبّع من القراءة الخام إلى التسلسل المتوافق عليه.',
    eyebrow: 'ورقة Phaeno البيضاء',
    lead: 'تعرض الورقة دليلًا تقنيًا أوليًا عبر سلسلة تشغيل PSeq، ولا ينبغي تفسيرها كتحقق إحصائي كامل أو تحقق سريري أو تحليل أداء تنظيمي.',
    sections: [
      { heading: 'الملخص', paragraphs: ['تبدأ منصة PSeq بتحضير مكتبات DNA ذات بنية معلوماتية متخصصة. ثم يزوّد تسلسل NGS المزدوج التقليدي مسار البيانات الآلي بكل المعلومات اللازمة لتجميع كل جزيء رنا على حدة. وتشكل هذه العناصر معًا بنية الإشارة الواضحة™ في PSeq، وهي إطار متكامل من الكيمياء إلى البيانات لتسلسل الجزيء الكامل.', 'تعرض هذه الورقة تحققًا تقنيًا أوليًا للإصدار PSeq v1 عبر سلسلة العمليات بأكملها. وفي دراسة حالة، يمكن تصور البيانات المجمعة لنسخة واحدة بسهولة باستخدام عارض الجينات مفتوح المصدر IGV، المصمم لفحص تسلسلات الجينوم الكامل وبيانات RNA-Seq. ويُظهر استعراض معلومات نسخة واحدة من الجين PRPF31 أداء المسار بمستوى من التفصيل لا يتوافر عادةً، كما يوضح قابلية تتبع جميع خطوات سلسلة تشغيل المنصة.', 'تمثل هذه الورقة البيضاء تحققًا تقنيًا أوليًا، ولا يجوز تفسيرها على أنها تحقق إحصائي كامل للمنصة أو تحقق سريري أو تحليل أداء تنظيمي.'] },
      { heading: 'الموضوعات الرئيسية', bullets: ['توزيع أحجام المكتبة وموضع العلامة', 'تأكيد البنية بتسلسل Sanger', 'بنية العلامة وcDNA في FASTQ', 'دراسة PRPF31 على مستوى الجزيء', 'تتبّع الأخطاء من القراءة الخام إلى التوافق'] },
      { heading: 'المحتويات', bullets: ['أسئلة التحقق من المكتبة وملخص الأدلة', 'توزيع أحجام المكتبة وموضع العلامة', 'تأكيد Sanger وتركيب قراءة FASTQ', 'دراسة حالة PRPF31 على مستوى الجزيء', 'محاذاة الإكسونات وتغطية وصلات التضفير من البداية إلى النهاية', 'تجميع التسلسل المتوافق عليه بطريقة shotgun وتتبع الأخطاء على مستوى القواعد', 'تفسير الأدلة الحالية والتحقق المخطط للمرحلة التالية'] },
    ],
    whitePaper: {
      pdfPath: '/white-papers/pseq-technical-whitepaper-part-4-initial-technical-validation.pdf', image: '/images/media/white-papers/pseq-technical-white-paper.png', date: '2026-07-31', pageCount: 12, version: '1.0',
      topics: ['ضبط جودة مكتبة PSeq', 'تأكيد موضع العلامة', 'بنية FASTQ', 'دراسة PRPF31', 'ربط وصلات الرنا', 'قابلية تتبّع التوافق'],
      searchKeywords: ['PSeq', 'التحقق التقني', 'Bioanalyzer', 'Sanger', 'FASTQ', 'PRPF31', 'IGV', 'SMID'],
    },
  }),
]

const publicationKeys = new Set(arabicWhitePapers.map((page) => page.translationKey))
const missingPublications = localizedRoutePairs.filter(
  (pair) => pair.translationKey.startsWith('white-paper.') && !publicationKeys.has(pair.translationKey),
)
if (missingPublications.length > 0) {
  throw new Error(`Arabic publication data is missing: ${missingPublications.map((page) => page.translationKey).join(', ')}`)
}

export function getArabicPageByPath(pathname: string) {
  const decoded = decodeURIComponent(pathname).replace(/\/+$/, '') || '/ar'
  return arabicWhitePapers.find((page) => page.route.ar === decoded)
}
