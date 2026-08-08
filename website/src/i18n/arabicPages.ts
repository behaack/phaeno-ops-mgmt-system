import { localizedRoutePairs, type LocalizedRoutePair } from './routes'
import type { TranslationStatus } from './locales'

export interface ArabicSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

export interface ArabicWhitePaper {
  pdfPath: string
  image: string
  date: string
  pageCount: number
  version: string
  topics: string[]
  searchKeywords: string[]
}

export interface ArabicPage {
  translationKey: string
  sourceLocale: 'en-US'
  sourceRevision: string
  translationStatus: TranslationStatus
  kind: 'standard' | 'empty-list' | 'white-paper-list' | 'white-paper' | 'contact'
  title: string
  metaTitle: string
  description: string
  eyebrow: string
  lead: string
  sections: ArabicSection[]
  emptyMessage?: string
  whitePaper?: ArabicWhitePaper
  route: LocalizedRoutePair
}

type ArabicPageInput = Omit<ArabicPage, 'sourceLocale' | 'sourceRevision' | 'translationStatus' | 'route'>

function defineArabicPage(input: ArabicPageInput): ArabicPage {
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

export const arabicPages: ArabicPage[] = [
  defineArabicPage({
    translationKey: 'page.home',
    kind: 'standard',
    title: 'قراءة الرنا بطوله الكامل، جزيئًا بعد جزيء',
    metaTitle: 'Phaeno | تسلسل الرنا كامل الطول باستخدام PSeq',
    description: 'تطوّر Phaeno منصة PSeq للحفاظ على هوية جزيء الرنا وإعادة بناء الأشكال الإسوية كاملة الطول باستخدام أجهزة NGS ذات القراءات القصيرة.',
    eyebrow: 'اكتشاف بيولوجيا الرنا',
    lead: 'تكشف منصة PSeq البنية الكاملة لنسخ الرنا مع إبقاء كل نتيجة مرتبطة بالأدلة الجزيئية التي أنتجتها.',
    sections: [
      {
        heading: 'من القراءات القصيرة إلى جزيئات قابلة للتتبّع',
        paragraphs: ['تضيف PSeq معرّفًا إلى جزيء المصدر قبل إنشاء المكتبة، ثم تجمع القراءات التي جاءت من الجزيء نفسه لإعادة بناء تسلسله الكامل واتجاهه.'],
        bullets: ['هوية جزيئية محفوظة قبل التجزئة', 'إعادة بناء للأشكال الإسوية كاملة الطول', 'سجل أدلة قابل للفحص من FASTQ إلى التسلسل المتوافق عليه'],
      },
      {
        heading: 'مصممة للبنية التحتية القائمة',
        paragraphs: ['تعمل المكتبات على أجهزة التسلسل المزدوج ذات القراءات القصيرة دون تعديل الجهاز، بينما يحوّل مسار بيانات آلي النتائج إلى سجلات رنا على مستوى الجزيء.'],
      },
      {
        heading: 'للاستخدام البحثي فقط',
        paragraphs: ['PSeq منصة بحثية قيد التطوير. لا تمثل المواد المعروضة تحققًا سريريًا أو ادعاءً تشخيصيًا أو تنظيميًا.'],
      },
    ],
  }),
  defineArabicPage({
    translationKey: 'page.pseq-platform',
    kind: 'standard',
    title: 'منصة PSeq',
    metaTitle: 'منصة PSeq | تسلسل الرنا كامل الطول | Phaeno',
    description: 'تعرّف على كيفية حفاظ PSeq على هوية جزيء المصدر لإعادة بناء رنا كامل الطول ومحلول الأشكال الإسوية باستخدام أجهزة NGS القياسية.',
    eyebrow: 'بنية متكاملة من الكيمياء إلى البيانات',
    lead: 'تجمع PSeq بين وسم جزيء المصدر وبناء المكتبة والتسلسل المزدوج وإعادة البناء الحاسوبي في سير عمل واحد قابل للتتبّع.',
    sections: [
      {
        heading: 'الحفاظ على هوية المصدر',
        paragraphs: ['يُضاف معرّف جزيء المصدر (SMID) وإشارة اتجاه السلسلة أثناء النسخ العكسي، قبل أن تُجزّأ المكتبة إلى قراءات قصيرة.'],
      },
      {
        heading: 'إعادة بناء على مستوى الجزيء',
        bullets: ['اكتشاف علامة PSeq في القراءات', 'تجميع القراءات حسب SMID', 'تحديد الجين المصدر', 'التجميع وإنشاء تسلسل متوافق عليه', 'حفظ مصدر كل دليل في قاعدة بيانات خاصة بالتشغيل'],
      },
      {
        heading: 'حدود الاستخدام الحالي',
        paragraphs: ['المواد الحالية تصف بنية المنصة والتحقق التقني الأولي. ولا ينبغي تفسيرها كتقييم أداء سريري أو تنظيمي مكتمل.'],
      },
    ],
  }),
  defineArabicPage({
    translationKey: 'page.multi-omics',
    kind: 'standard',
    title: 'PSeq والعلوم متعددة الأوميكس',
    metaTitle: 'PSeq والعلوم متعددة الأوميكس | Phaeno',
    description: 'توضح Phaeno كيف يمكن لبيانات الرنا المحلولة حسب الشكل الإسوي تقوية طبقة النسخ في دراسات الأوميكس المتعددة ونماذج الذكاء الاصطناعي.',
    eyebrow: 'طبقة نسخ أوضح',
    lead: 'تعتمد تحليلات الأوميكس المتعددة على جودة كل طبقة مدخلة. وتساعد PSeq على تمثيل ما عبّرت عنه الخلية فعليًا بدل اختزال النسخ المختلفة في إشارة جينية واحدة.',
    sections: [
      {
        heading: 'لماذا تتعطل الروابط بين طبقات الأوميكس؟',
        paragraphs: ['قد تجمع القياسات التقليدية كل نسخ الجين في قيمة واحدة، مع أن الأشكال الإسوية يمكن أن تختلف في البنية والوظيفة والاستقرار والترجمة.'],
      },
      {
        heading: 'ما تضيفه PSeq',
        bullets: ['بنية نسخة كاملة الطول', 'تحديد مشترك للوصلات والمتغيرات على الجزيء نفسه', 'ميزات قابلة للتتبّع للتحليل الإحصائي والتعلم الآلي', 'ربط أوضح بين النسخ والبروتين والظاهرة الحيوية'],
      },
      {
        heading: 'تفسير منضبط',
        paragraphs: ['زيادة دقة طبقة الرنا لا تثبت وحدها السببية أو الفائدة السريرية. يجب تقييم كل استنتاج ضمن تصميم الدراسة والأدلة المستقلة.'],
      },
    ],
  }),
  defineArabicPage({
    translationKey: 'page.why-isoforms-matter',
    kind: 'standard',
    title: 'لماذا تهمّ الأشكال الإسوية للرنا؟',
    metaTitle: 'أهمية الأشكال الإسوية للرنا | Phaeno',
    description: 'تحدد الأشكال الإسوية للرنا كيفية عمل الجينات. ويكشف التسلسل كامل الطول ومحلول الأشكال الإسوية بنية النسخ وسلوكها في علم الأحياء.',
    eyebrow: 'الجين ليس ناتجًا واحدًا',
    lead: 'يمكن لجين واحد أن ينتج نسخ رنا متعددة تختلف في الوصلات والبدايات والنهايات ومناطق الترميز، وقد تقود هذه الاختلافات إلى وظائف بيولوجية مختلفة.',
    sections: [
      {
        heading: 'الهوية البنيوية مهمة',
        paragraphs: ['تحديد وفرة الجين وحدها لا يوضح أي نسخة كانت موجودة أو كيف اجتمعت وصلاتها ومتغيراتها على الجزيء نفسه.'],
      },
      {
        heading: 'ما الذي يتيحه القياس كامل الطول؟',
        bullets: ['تمييز النسخ المتشابهة', 'ربط أحداث الوصل عبر الجزيء', 'اكتشاف تراكيب غير ممثلة جيدًا في المراجع', 'توفير سجل مباشر لفحص التجميع والتوافق'],
      },
      {
        heading: 'من الاكتشاف إلى الفرضية',
        paragraphs: ['تساعد البيانات المحلولة حسب الشكل الإسوي الباحثين على صياغة فرضيات أدق، لكنها تحتاج إلى تحقق تجريبي مستقل قبل إسناد وظيفة أو أثر سريري.'],
      },
    ],
  }),
  defineArabicPage({
    translationKey: 'page.about-us',
    kind: 'standard',
    title: 'من نحن',
    metaTitle: 'عن Phaeno | Phaeno',
    description: 'تعرّف على رسالة Phaeno وفريقها الساعي إلى رسم خريطة الجينوم البشري الوظيفي باستخدام تقنية PSeq لتسلسل الرنا كامل الطول.',
    eyebrow: 'Phaeno Biotech',
    lead: 'نبني أدوات تمكّن الباحثين من رؤية نسخ الرنا كوحدات جزيئية كاملة وقابلة للتتبّع، بهدف تحسين فهم العلاقة بين الجين والوظيفة والظاهرة الحيوية.',
    sections: [
      {
        heading: 'رسالتنا',
        paragraphs: ['تسعى Phaeno إلى جعل البنية الوظيفية للرنا قابلة للقياس على نطاق واسع، مع الحفاظ على الأدلة التي تربط كل استنتاج بقراءات التسلسل الأصلية.'],
      },
      {
        heading: 'طريقة عملنا',
        bullets: ['دمج العلوم الجزيئية وهندسة البرمجيات', 'تصميم سير عمل قابل للتكرار والفحص', 'تمييز الدليل التقني الأولي عن التحقق الكامل', 'التعاون مع فرق البحث حول أسئلة بيولوجية محددة'],
      },
    ],
  }),
  defineArabicPage({
    translationKey: 'page.job-openings',
    kind: 'empty-list',
    title: 'الوظائف المتاحة',
    metaTitle: 'الوظائف المتاحة | Phaeno',
    description: 'انضم إلى Phaeno وساهم في تشكيل مستقبل تسلسل الرنا. اطّلع على الوظائف المتاحة وثقافة الشركة.',
    eyebrow: 'انضم إلى الفريق',
    lead: 'نجمع بين البيولوجيا الجزيئية وعلوم البيانات وهندسة البرمجيات لبناء منصة بحثية جديدة.',
    sections: [],
    emptyMessage: 'لا توجد وظائف منشورة باللغة العربية حاليًا. ستظهر هنا الوظائف بعد نشر نسخة عربية معتمدة منها.',
  }),
  defineArabicPage({
    translationKey: 'page.blog',
    kind: 'empty-list',
    title: 'مدونة Phaeno',
    metaTitle: 'مدونة Phaeno | Phaeno',
    description: 'مقالات Phaeno حول بيولوجيا الرنا وتسلسل الأشكال الإسوية ومنصة PSeq.',
    eyebrow: 'رؤى ومواد علمية',
    lead: 'تحتوي القائمة العربية فقط على المقالات التي اكتملت ترجمتها ومراجعتها ونشرها لهذه اللغة.',
    sections: [],
    emptyMessage: 'لا توجد مقالات منشورة باللغة العربية حاليًا.',
  }),
  defineArabicPage({
    translationKey: 'page.white-papers',
    kind: 'white-paper-list',
    title: 'الأوراق البيضاء',
    metaTitle: 'الأوراق البيضاء | Phaeno',
    description: 'اقرأ الصفحات العربية للأوراق التقنية التي تشرح منصة PSeq وبنيتها الجزيئية ومسار البيانات والتحقق التقني الأولي.',
    eyebrow: 'السلسلة التقنية لمنصة PSeq',
    lead: 'تتوفر صفحات هبوط عربية قيد المراجعة. ملفات PDF المرتبطة بها باللغة الإنجليزية ويُشار إلى ذلك بوضوح عند التنزيل.',
    sections: [],
  }),
  defineArabicPage({
    translationKey: 'page.contact',
    kind: 'contact',
    title: 'اتصل بنا',
    metaTitle: 'اتصل بنا | Phaeno',
    description: 'تواصل مع Phaeno لمناقشة تقنية PSeq لتسلسل الرنا أو الشراكات أو استفسارات المستثمرين أو تحديثات الشركة.',
    eyebrow: 'ابدأ محادثة',
    lead: 'أخبرنا بالسؤال البيولوجي أو سير العمل الذي تعمل عليه. نرحب بالتواصل مع فرق البحث والشركاء والمستثمرين.',
    sections: [
      {
        heading: 'بيانات الاتصال',
        paragraphs: ['5270 California Avenue, Suite 300, Irvine, CA 92617', 'info@phaenobiotech.com'],
      },
    ],
  }),
  defineArabicPage({
    translationKey: 'page.investors',
    kind: 'standard',
    title: 'المستثمرون',
    metaTitle: 'المستثمرون | Phaeno',
    description: 'استكشف فرصة Phaeno الاستثمارية حول PSeq وتسلسل الرنا كامل الطول ورسم خريطة الجينوم البشري الوظيفي.',
    eyebrow: 'بناء فئة جديدة من بيانات الرنا',
    lead: 'تطوّر Phaeno منصة تجمع الكيمياء والمعلوماتية لإنتاج بيانات رنا على مستوى الجزيء باستخدام بنية NGS واسعة الانتشار.',
    sections: [
      {
        heading: 'الفرصة',
        paragraphs: ['تحتاج الأبحاث الدوائية والبيولوجية إلى تمثيل أدق للنسخ التي تنتجها الخلايا. تستهدف PSeq هذه الفجوة مع الحفاظ على قابلية التتبّع والبنية التشغيلية القياسية.'],
      },
      {
        heading: 'تواصل معنا',
        paragraphs: ['للحصول على معلومات المستثمرين الحالية، تواصل مع فريق Phaeno عبر صفحة الاتصال. لا تشكل هذه الصفحة عرضًا للأوراق المالية أو نصيحة استثمارية.'],
      },
    ],
  }),
  defineArabicPage({
    translationKey: 'page.privacy',
    kind: 'standard',
    title: 'سياسة الخصوصية',
    metaTitle: 'سياسة الخصوصية | Phaeno',
    description: 'اطّلع على ملخص عربي تجريبي لسياسة خصوصية Phaeno وكيفية جمع المعلومات واستخدامها وحمايتها.',
    eyebrow: 'مسودة ترجمة للمراجعة',
    lead: 'هذه ترجمة عربية تجريبية غير معتمدة. يبقى النص الإنجليزي الحالي هو النص المرجعي إلى أن تكتمل المراجعة القانونية واللغوية.',
    sections: [
      {
        heading: 'المعلومات التي نتلقاها',
        paragraphs: ['قد نتلقى المعلومات التي تقدمها عبر نماذج الموقع، مثل الاسم والمؤسسة وعنوان البريد الإلكتروني ووصف الاستفسار، إضافة إلى بيانات تشغيلية محدودة لازمة لأمن الموقع وأدائه.'],
      },
      {
        heading: 'الاستخدام والحماية',
        paragraphs: ['نستخدم المعلومات للرد على الطلبات وتقديم المواد المطلوبة وتشغيل الموقع وتحسينه والوفاء بالالتزامات القانونية. نطبق ضوابط مناسبة لتقليل الوصول غير المصرح به.'],
      },
      {
        heading: 'الاختيارات والتواصل',
        paragraphs: ['يمكنك طلب معلومات حول بياناتك أو تحديث تفضيلات التواصل عبر info@phaenobiotech.com. راجع النسخة الإنجليزية للحصول على النص الكامل المعمول به حاليًا.'],
      },
    ],
  }),
  defineArabicPage({
    translationKey: 'page.data-policies',
    kind: 'standard',
    title: 'سياسات بيانات Phaeno',
    metaTitle: 'أمن البيانات والاحتفاظ بها والنسخ الاحتياطي | Phaeno',
    description: 'اطّلع على ملخص عربي تجريبي لسياسات Phaeno المتعلقة بإدارة البيانات وتخزينها والاحتفاظ بها ونسخها احتياطيًا وحمايتها.',
    eyebrow: 'مسودة ترجمة للمراجعة',
    lead: 'هذه ترجمة عربية تجريبية غير معتمدة. تبقى سياسة البيانات الإنجليزية المنشورة هي المرجع حتى اكتمال المراجعة القانونية والأمنية واللغوية.',
    sections: [
      {
        heading: 'إدارة البيانات',
        paragraphs: ['تهدف ضوابط Phaeno إلى تقييد الوصول إلى البيانات وفق الحاجة العملية، وتسجيل العمليات ذات الصلة، وحماية النقل والتخزين بما يتناسب مع نوع البيانات.'],
      },
      {
        heading: 'الاحتفاظ والنسخ الاحتياطي',
        paragraphs: ['تُحدد فترات الاحتفاظ وإجراءات النسخ الاحتياطي والاستعادة وفق متطلبات الخدمة والعقود والالتزامات النظامية. لا يغيّر هذا الملخص أي التزام تعاقدي.'],
      },
      {
        heading: 'النص المرجعي',
        paragraphs: ['يجب الرجوع إلى النسخة الإنجليزية المنشورة للحصول على التفاصيل الكاملة والسياسة المعمول بها حاليًا.'],
      },
    ],
  }),
  defineArabicPage({
    translationKey: 'white-paper.platform-overview',
    kind: 'white-paper',
    title: 'PSeq: تسلسل مرحلي للرنا على مستوى الجزيء باستخدام منصات NGS القياسية',
    metaTitle: 'PSeq: تسلسل الرنا على مستوى الجزيء | Phaeno',
    description: 'تجمع PSeq بين وسم جزيء المصدر وNGS المزدوج وإعادة بناء النسخ آليًا وسجلات SQL خاصة بكل تشغيل لتحليل الرنا القابل للتتبّع.',
    eyebrow: 'ورقة Phaeno البيضاء',
    lead: 'تعرض هذه الورقة المشكلة الأساسية للمنصة وبنيتها ونموذج تشغيلها، دون وصف وصفات الكواشف أو نتائج التحقق التفصيلية.',
    sections: [
      { heading: 'الملخص', paragraphs: ['تجلب PSeq دقة الجزيء الكامل والربط المرحلي من طرف إلى طرف إلى أجهزة NGS ذات القراءات القصيرة. وتجمع القراءات حسب معرّف جزيء المصدر لإعادة بناء نسخة متوافقة عليها مع الاحتفاظ بأدلتها.'] },
      { heading: 'الموضوعات الرئيسية', bullets: ['إثبات هوية جزيء المصدر قبل التجزئة', 'التجميع حسب SMID وإعادة بناء النسخة', 'تكامل الوسم الجزيئي والتجميع الآلي وسجلات SQL', 'التشغيل على بنية NGS القياسية'] },
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
      { heading: 'الملخص', paragraphs: ['تضيف PSeq وسمًا متعدد الوظائف أثناء النسخ العكسي، ثم تعيد توزيع علامته بين الشظايا العشوائية الناتجة من cDNA الموسوم. يحمل الوسم SMID ومعالم تسلسلية ثابتة ومعلومة اتجاه السلسلة.'] },
      { heading: 'الموضوعات الرئيسية', bullets: ['باركودات SMID عالية التنوع', 'مميّزات اتجاه السلسلة', 'التجزئة داخل الجزيء ونقل العلامة', 'بنية القراءة المزدوجة والواجهة بين الكيمياء ومسار البيانات'] },
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
      { heading: 'الملخص', paragraphs: ['يحدد المسار علامة PSeq ويستعيد SMID وإشارة الاتجاه ويجمع القراءات التي نشأت من النسخة العكسية نفسها. ثم يحدد الجين المصدر ويجمع التسلسل ويسجل سلسلة الأدلة في قاعدة SQL خاصة بالتشغيل.'] },
      { heading: 'الموضوعات الرئيسية', bullets: ['تحديد العلامة واستعادة SMID', 'تجميع القراءات حسب الجزيء', 'التجميع المرجعي ومن دون مرجع', 'إنشاء التسلسل المتوافق عليه', 'المصدر الجزيئي من FASTQ إلى السجل النهائي'] },
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
      { heading: 'الملخص', paragraphs: ['تجمع بنية مكتبة PSeq بين معلومات الوسم والتسلسل المزدوج ومسار بيانات آلي لإعادة بناء كل جزيء رنا. وتوضح دراسة PRPF31 الأداء وقابلية تتبّع الخطوات بتفصيل جزيئي.'] },
      { heading: 'الموضوعات الرئيسية', bullets: ['توزيع أحجام المكتبة وموضع العلامة', 'تأكيد البنية بتسلسل Sanger', 'بنية العلامة وcDNA في FASTQ', 'دراسة PRPF31 على مستوى الجزيء', 'تتبّع الأخطاء من القراءة الخام إلى التوافق'] },
    ],
    whitePaper: {
      pdfPath: '/white-papers/pseq-technical-whitepaper-part-4-initial-technical-validation.pdf', image: '/images/media/white-papers/pseq-technical-white-paper.png', date: '2026-07-31', pageCount: 12, version: '1.0',
      topics: ['ضبط جودة مكتبة PSeq', 'تأكيد موضع العلامة', 'بنية FASTQ', 'دراسة PRPF31', 'ربط وصلات الرنا', 'قابلية تتبّع التوافق'],
      searchKeywords: ['PSeq', 'التحقق التقني', 'Bioanalyzer', 'Sanger', 'FASTQ', 'PRPF31', 'IGV', 'SMID'],
    },
  }),
]

const pageKeys = new Set(arabicPages.map((page) => page.translationKey))
const missingPages = localizedRoutePairs.filter((pair) => !pageKeys.has(pair.translationKey))
if (missingPages.length > 0) {
  throw new Error(`Arabic page data is missing: ${missingPages.map((page) => page.translationKey).join(', ')}`)
}

export function getArabicPageByPath(pathname: string) {
  const decoded = decodeURIComponent(pathname).replace(/\/+$/, '') || '/ar'
  return arabicPages.find((page) => page.route.ar === decoded)
}

export const arabicWhitePapers = arabicPages.filter(
  (page): page is ArabicPage & { whitePaper: ArabicWhitePaper } => Boolean(page.whitePaper),
)
