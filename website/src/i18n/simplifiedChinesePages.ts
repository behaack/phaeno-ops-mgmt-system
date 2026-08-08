import { localizedRoutePairs } from './routes'
import type { LocalizedPublicationInput, LocalizedPublicationPage } from './publicationTypes'
import { brandTerms } from './brandTerms'

const pseqArchitecture = brandTerms.pseqClearSignalArchitecture

function defineSimplifiedChinesePage(input: LocalizedPublicationInput): LocalizedPublicationPage {
  const route = localizedRoutePairs.find((candidate) => candidate.translationKey === input.translationKey)
  if (!route) throw new Error(`Missing route pair for Simplified Chinese page ${input.translationKey}.`)

  return {
    ...input,
    sourceLocale: 'en-US',
    sourceRevision: '2026-08-07',
    translationStatus: 'draft',
    route,
  }
}

const simplifiedChineseInputs: LocalizedPublicationInput[] = [
  {
    "translationKey": "white-paper.platform-overview",
    "kind": "white-paper",
    "title": "PSeq：标准短读 NGS 上的全分子定相 RNA 测序",
    "metaTitle": "PSeq：标准短读长 NGS 的全分子定相 RNA 测序 | Phaeno",
    "description": "PSeq 结合了源分子标记、双端短读 NGS、自动转录重建和运行特定的 SQL 记录，用于可追踪的全分子 RNA 分析。",
    "eyebrow": "Phaeno 白皮书",
    "lead": "PSeq 结合了源分子标记、双端短读 NGS、自动转录重建和运行特定的 SQL 记录，用于可追踪的全分子 RNA 分析。",
    "sections": [
      {
        "heading": "抽象的",
        "paragraphs": [
          "PSeq 是一种研究用 RNA 测序平台，可为标准短读长下一代测序 (NGS) 带来全分子分辨率和端到端定相。在逆转录过程中，源分子标记试剂标记每个 RNA 序列，而文库策略则在随机片段中保留标记标记。双端测序在未修改的仪器上运行，而自动管道通过源分子标识符 (SMID) 进行组读取，识别源基因，组装共有序列，并在特定于运行的 SQL 数据库中保留支持记录。",
          "本文介绍了该平台的核心问题、架构和运营模型。它省略了操作试剂配方和详细的验证结果，这些内容在配套论文中介绍。"
        ]
      },
      {
        "heading": "重点议题",
        "bullets": [
          "在文库碎片化之前建立源分子身份",
          "基于SMID的读段分组和端到端转录本重建",
          "耦合分子标记、自动组装和特定于运行的 SQL 记录",
          "在标准双端短读 NGS 基础设施上部署"
        ]
      },
      {
        "heading": "内容",
        "bullets": [
          "短读链接问题",
          `${pseqArchitecture.name} 和设计原理`,
          "端到端运营模式",
          "三个耦合平台组件",
          "分子水平分析和证据追溯",
          "部署模型、可交付成果和当前边界"
        ]
      }
    ],
    "whitePaper": {
      "pdfPath": "/white-papers/pseq-technical-whitepaper-part-1-platform-overview.pdf",
      "image": "/images/media/white-papers/pseq-technical-white-paper.png",
      "date": "2026-07-31",
      "pageCount": 7,
      "version": "1.0",
      "topics": [
        "全分子定相RNA测序",
        "PSeq平台架构",
        "源分子标识符标记",
        "短读 NGS 工作流程",
        "可追踪的RNA数据模型"
      ],
      "searchKeywords": [
        "PSeq",
        "全分子RNA测序",
        "定相RNA测序",
        "短读 NGS",
        "源分子标识符",
        "SMID",
        "链义鉴别器",
        "转录重建",
        "运行特定的 SQL 数据库"
      ]
    }
  },
  {
    "translationKey": "white-paper.molecular-tagging",
    "kind": "white-paper",
    "title": "PSeq 分子标记和库架构",
    "metaTitle": "PSeq 分子标记和库架构 | Phaeno",
    "description": "保留源分子身份和链意义的设计原则。",
    "eyebrow": "Phaeno 白皮书",
    "lead": "保留源分子身份和链意义的设计原则。",
    "sections": [
      {
        "heading": "抽象的",
        "paragraphs": [
          "从短读长重建全分子需要的不仅仅是测序深度：片段必须保持与其来源分子的可靠连接。 PSeq 通过在逆转录过程中引入多功能标签并将其标记重新分布在由标记的 cDNA 生成的随机片段中来满足这一要求。该标记带有高多样性源分子标识符 (SMID)、固定序列标志以及可在双端测序后识别的链义信息。",
          "本文描述了 PSeq 文库的分子设计和预期读取结构。它是架构描述，而不是试剂配方或验证报告。详细的试剂盒成分和操作程序保留在受控的 SOP 中；验证的技术证据在本系列的第 4 篇论文中得到了整合。",
          "设计目标：将源 cDNA 片段化到传统的短读长文库中，而不会丢失每个片段所来源的 RNA 分子的身份或链义。"
        ]
      },
      {
        "heading": "重点议题",
        "bullets": [
          "高多样性 SMID 条形码、包装纸和不变检查基数",
          "链感鉴别器和机器可识别的标记设计",
          "分子内断裂和标记转移",
          "双端读取结构和化学与管道接口"
        ]
      },
      {
        "heading": "内容",
        "bullets": [
          "身份保护问题",
          "PSeq 标签剖析",
          "源分子标识符、包装器、检查碱基和链检测设计",
          "从 RNA 标记到双端 PSeq DNA 文库",
          "预期的测序-读取合同",
          "设计变体、管道接口和受控 SOP 边界"
        ]
      }
    ],
    "whitePaper": {
      "pdfPath": "/white-papers/pseq-technical-whitepaper-part-2-molecular-tagging.pdf",
      "image": "/images/media/white-papers/pseq-technical-white-paper.png",
      "date": "2026-07-31",
      "pageCount": 5,
      "version": "1.0",
      "topics": [
        "源分子标记",
        "SMID条码架构",
        "链义鉴别器",
        "PSeq 库建设",
        "双端读取结构"
      ],
      "searchKeywords": [
        "PSeq",
        "分子标记",
        "源分子标识符",
        "SMID",
        "链义鉴别器",
        "标记的cDNA",
        "分子内碎裂",
        "双端测序"
      ]
    }
  },
  {
    "translationKey": "white-paper.data-pipeline",
    "kind": "white-paper",
    "title": "PSeq 数据管道",
    "metaTitle": "PSeq 数据管道 | Phaeno",
    "description": "DNA文库结构 ● 计算组装 ● 数据溯源",
    "eyebrow": "Phaeno 白皮书",
    "lead": "DNA文库结构 ● 计算组装 ● 数据溯源",
    "sections": [
      {
        "heading": "抽象的",
        "paragraphs": [
          "PSeq 数据管道旨在将标记 RNA 库中的双端短读转换为分子特异性转录记录。首先定位 PSeq 标记标签，恢复源分子标识符 (SMID) 和链信号，并对源自一个标记逆转录本的读数进行分组。在每个分子箱内，管道识别并检索源基因的序列，组装序列，创建比对产物，并将证据链记录在特定于运行的 SQL 数据库中。",
          "本文描述了计算架构、数据产品、部署模型和来源策略。它本身不呈现验证结果；最初的库和管道证据在本系列的第 4 篇论文中进行了整合。",
          "计算目标：将标记的短读段转化为可独立检查的分子记录，同时不失去与原始序列和质量证据的联系。"
        ]
      },
      {
        "heading": "重点议题",
        "bullets": [
          "标记定位、SMID 恢复和分子特异性读取聚类",
          "源基因识别和参考检索",
          "从头和参考引导组装、对齐和共识生成",
          "从 FASTQ 证据到分子记录的运行特定 SQL 来源"
        ]
      },
      {
        "heading": "内容",
        "bullets": [
          "输入模型和十级管道",
          "标记解析、读取修剪、重复数据删除和 SMID 合并",
          "源基因鉴定和分子组装",
          "对齐、共识和分析产品",
          "特定于运行的 SQL 记录层和分子起源",
          "部署、客户端报告和验证界面"
        ]
      }
    ],
    "whitePaper": {
      "pdfPath": "/white-papers/pseq-technical-whitepaper-part-3-data-pipeline.pdf",
      "image": "/images/media/white-papers/pseq-technical-white-paper.png",
      "date": "2026-07-31",
      "pageCount": 7,
      "version": "1.0",
      "topics": [
        "PSeq 标记解析",
        "基于SMID的读聚类",
        "源基因鉴定",
        "转录本组装和共识",
        "特定于运行的 SQL 来源"
      ],
      "searchKeywords": [
        "PSeq",
        "PSeq 数据管道",
        "FASTQ",
        "源分子标识符",
        "SMID 聚类",
        "参考引导装配",
        "从头组装",
        "RNA共有序列",
        "分子起源"
      ]
    }
  },
  {
    "translationKey": "white-paper.initial-validation",
    "kind": "white-paper",
    "title": "PSeq全分子RNA测序平台的初步技术验证",
    "metaTitle": "PSeq全分子RNA测序平台的初步技术验证| Phaeno",
    "description": "PSeq v1 初始证据检查文库结构、标记位置、SMID 分组转录本组装、PRPF31 定相以及原始读取到共识的可追溯性。",
    "eyebrow": "Phaeno 白皮书",
    "lead": "PSeq v1 初始证据检查文库结构、标记位置、SMID 分组转录本组装、PRPF31 定相以及原始读取到共识的可追溯性。",
    "sections": [
      {
        "heading": "抽象的",
        "paragraphs": [
          "PSeq 平台首先使用专门的信息架构准备 DNA 库。  然后，传统的 NGS 双端测序为自动化数据管道提供组装每个单独 RNA 所需的所有信息。这些元素共同构成了 PSeq Clear-Signal Architecture™，这是一个用于全分子测序的集成化学到数据框架。本文介绍了 PSeq v1 在整个运营链中的初步技术验证。在案例研究中，使用专为检查全基因组序列和 RNA-Seq 数据而设计的开源基因查看器 (IGV) 可以轻松可视化为单个转录本组装的数据。逐步浏览来自基因 PRPF31 的单个转录本的信息，可以以其他方式无法获得的详细程度可视化管道性能。  该练习进一步说明了平台操作链中所有步骤的可追溯性。本白皮书构成初步技术验证，不应被解释为统计上完整的平台验证、临床验证或监管性能分析。"
        ]
      },
      {
        "heading": "重点议题",
        "bullets": [
          "Bioanalyzer 文库大小概况和标记位置证据",
          "Sanger 标记、条形码和检查库结构的确认",
          "代表性 FASTQ 标签加 cDNA 结构和同基因读段配对",
          "PRPF31 SMID-bin 单基因限制和剪接点定相的证据",
          "原始读取到共识的可追溯性和当前验证限制"
        ]
      },
      {
        "heading": "内容",
        "bullets": [
          "文库验证问题和证据摘要",
          "文库大小分布和标记放置",
          "Sanger 确认和 FASTQ 读取作文",
          "PRPF31分子水平案例研究",
          "外显子比对和端到端剪接点覆盖",
          "Shotgun 共识组装和基础级错误可追溯性",
          "对当前证据的解释和计划的下一阶段验证"
        ]
      }
    ],
    "whitePaper": {
      "pdfPath": "/white-papers/pseq-technical-whitepaper-part-4-initial-technical-validation.pdf",
      "image": "/images/media/white-papers/pseq-technical-white-paper.png",
      "date": "2026-07-31",
      "pageCount": 12,
      "version": "1.0",
      "topics": [
        "PSeq文库质量控制",
        "标记放置和 Sanger 确认",
        "FASTQ读取结构",
        "PRPF31分子水平案例研究",
        "端到端拼接接头定相",
        "共识可追溯性和验证限制"
      ],
      "searchKeywords": [
        "PSeq",
        "PSeq技术验证",
        "Bioanalyzer",
        "标记放置",
        "Sanger测序",
        "FASTQ读取结构",
        "PRPF31",
        "IGV",
        "生鱼片情节",
        "SMID",
        "共识准确性"
      ]
    }
  }
]

export const simplifiedChineseWhitePapers = simplifiedChineseInputs.map(defineSimplifiedChinesePage)

const publicationKeys = new Set(simplifiedChineseWhitePapers.map((page) => page.translationKey))
const missingPublications = localizedRoutePairs.filter(
  (pair) => pair.translationKey.startsWith('white-paper.') && !publicationKeys.has(pair.translationKey),
)
if (missingPublications.length > 0) {
  throw new Error(`Simplified Chinese publication data is missing: ${missingPublications.map((page) => page.translationKey).join(', ')}`)
}
