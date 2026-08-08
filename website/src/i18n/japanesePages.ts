import { localizedRoutePairs } from './routes'
import type { LocalizedPublicationInput, LocalizedPublicationPage } from './publicationTypes'
import { brandTerms } from './brandTerms'

const pseqArchitecture = brandTerms.pseqClearSignalArchitecture

function defineJapanesePage(input: LocalizedPublicationInput): LocalizedPublicationPage {
  const route = localizedRoutePairs.find((candidate) => candidate.translationKey === input.translationKey)
  if (!route) throw new Error(`Missing route pair for Japanese page ${input.translationKey}.`)

  return {
    ...input,
    sourceLocale: 'en-US',
    sourceRevision: '2026-08-07',
    translationStatus: 'draft',
    route,
  }
}

const japaneseInputs: LocalizedPublicationInput[] = [
  {
    "translationKey": "white-paper.platform-overview",
    "kind": "white-paper",
    "title": "PSeq: 標準ショートリード NGS での全分子フェーズド RNA シーケンシング",
    "metaTitle": "PSeq: 標準ショートリード NGS での全分子フェーズド RNA シーケンシング | Phaeno",
    "description": "PSeq は、ソース分子のタグ付け、ペアエンドのショートリード NGS、自動転写再構築、および実行固有の SQL レコードを組み合わせて、追跡可能な全分子 RNA 分析を実現します。",
    "eyebrow": "Phaeno ホワイトペーパー",
    "lead": "PSeq は、ソース分子のタグ付け、ペアエンドのショートリード NGS、自動転写再構築、および実行固有の SQL レコードを組み合わせて、追跡可能な全分子 RNA 分析を実現します。",
    "sections": [
      {
        "heading": "抽象的な",
        "paragraphs": [
          "PSeq は、標準的なショートリード次世代シーケンス (NGS) に分子全体の分解能とエンドツーエンドのフェージングをもたらす研究用 RNA シーケンス プラットフォームです。逆転写中、ソース分子タグ付け試薬が各 RNA 配列を標識し、ライブラリ戦略によりランダムなフラグメントにわたってタグ マーカーが保存されます。ペアエンド シーケンシングは未変更の機器で実行されますが、自動パイプラインはソース分子識別子 (SMID) ごとに読み取りをグループ化し、ソース遺伝子を特定し、コンセンサス配列を組み立てて、実行固有の SQL データベースにサポート レコードを保持します。",
          "このペーパーでは、プラットフォームの中核的な問題、アーキテクチャ、および運用モデルについて説明します。関連論文で説明されている操作用試薬のレシピと詳細な検証結果は省略されています。"
        ]
      },
      {
        "heading": "主要トピック",
        "bullets": [
          "ライブラリの断片化前にソース分子の同一性を確立",
          "SMID ベースのリード グループ化とエンドツーエンドのトランスクリプト再構築",
          "結合された分子タグ付け、自動アセンブリ、および実行固有の SQL レコード",
          "標準のペアエンド短読み取り NGS インフラストラクチャへの展開"
        ]
      },
      {
        "heading": "コンテンツ",
        "bullets": [
          "ショートリードリンケージ問題",
          `${pseqArchitecture.name} と設計原則`,
          "エンドツーエンドの運用モデル",
          "3 つの結合されたプラットフォーム コンポーネント",
          "分子レベルの分析と証拠のトレーサビリティ",
          "導入モデル、成果物、現在の境界"
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
        "全分子フェーズド RNA シーケンス",
        "PSeq プラットフォーム アーキテクチャ",
        "ソース分子識別子のタグ付け",
        "短時間読み取り NGS ワークフロー",
        "追跡可能なRNAデータモデル"
      ],
      "searchKeywords": [
        "PSeq",
        "全分子RNAシーケンス",
        "フェーズドRNAシーケンス",
        "短読 NGS",
        "ソース分子の識別子",
        "SMID",
        "ストランドセンス弁別器",
        "転写再構築",
        "実行固有の SQL データベース"
      ]
    }
  },
  {
    "translationKey": "white-paper.molecular-tagging",
    "kind": "white-paper",
    "title": "PSeq 分子タグ付けとライブラリーのアーキテクチャ",
    "metaTitle": "PSeq 分子タグ付けとライブラリーのアーキテクチャ | Phaeno",
    "description": "ソース分子の同一性と鎖のセンスを維持するための設計原則。",
    "eyebrow": "Phaeno ホワイトペーパー",
    "lead": "ソース分子の同一性と鎖のセンスを維持するための設計原則。",
    "sections": [
      {
        "heading": "抽象的な",
        "paragraphs": [
          "短いリードからの分子全体の再構築には、配列決定の深さ以上のものが必要です。フラグメントは、その起源となる分子との信頼できる接続を保持していなければなりません。 PSeq は、逆転写中に多機能タグを導入し、タグ付き cDNA から生成されたランダムなフラグメント間でそのマーカーを再分配することで、その要件に対処します。このマーカーには、多様性の高いソース分子識別子 (SMID)、固定配列ランドマーク、およびペアエンド シーケンシング後に認識できるストランドセンス情報が含まれています。",
          "この論文では、PSeq ライブラリーの分子設計と予想される読み取り構造について説明します。これはアーキテクチャの説明であり、試薬レシピや検証レポートではありません。詳細なキット構成と操作手順は管理された SOP に残されています。検証のための技術的証拠は、このシリーズの論文 4 に統合されています。",
          "設計の目的: 各フラグメントの元となった RNA 分子の同一性や鎖センスを失うことなく、ソース cDNA を従来のショートリード ライブラリーにフラグメント化します。"
        ]
      },
      {
        "heading": "主要トピック",
        "bullets": [
          "高多様性 SMID バーコード、ラッパー、不変チェックベース",
          "ストランドセンス弁別器と機械認識可能なマーカー設計",
          "分子内断片化とマーカー転移",
          "ペアエンド読み取り構造と化学物質からパイプラインへのインターフェイス"
        ]
      },
      {
        "heading": "コンテンツ",
        "bullets": [
          "アイデンティティの保持の問題",
          "PSeq タグの構造",
          "ソース分子識別子、ラッパー、チェックベース、およびストランドセンス設計",
          "RNA タグ付けからペアエンド PSeq DNA ライブラリーまで",
          "予期されるシーケンス読み取りコントラクト",
          "設計バリアント、パイプライン インターフェイス、および制御された SOP 境界"
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
        "ソース分子のタグ付け",
        "SMID バーコード アーキテクチャ",
        "ストランドセンス識別子",
        "PSeq ライブラリの構築",
        "ペアエンドリード構造"
      ],
      "searchKeywords": [
        "PSeq",
        "分子タグ付け",
        "ソース分子の識別子",
        "SMID",
        "ストランドセンス弁別器",
        "タグ付きcDNA",
        "分子内断片化",
        "ペアエンドシーケンス"
      ]
    }
  },
  {
    "translationKey": "white-paper.data-pipeline",
    "kind": "white-paper",
    "title": "PSeq データ パイプライン",
    "metaTitle": "PSeq データ パイプライン | Phaeno",
    "description": "DNA ライブラリの構造 ● 計算によるアセンブリ ● データのトレーサビリティ",
    "eyebrow": "Phaeno ホワイトペーパー",
    "lead": "DNA ライブラリの構造 ● 計算によるアセンブリ ● データのトレーサビリティ",
    "sections": [
      {
        "heading": "抽象的な",
        "paragraphs": [
          "PSeq データ パイプラインは、タグ付き RNA ライブラリからのペアエンド ショート リードを分子固有の転写レコードに変換するように設計されています。まず、PSeq マーカー タグを特定し、ソース分子識別子 (SMID) と鎖シグナルを回復し、1 つのタグ付き逆転写産物に由来するリードをグループ化します。各分子ビン内で、パイプラインはソース遺伝子の配列を特定して取得し、配列を組み立て、アライメント産物を作成し、実行固有の SQL データベースに証拠チェーンを記録します。",
          "このペーパーでは、コンピューティング アーキテクチャ、データ製品、展開モデル、来歴戦略について説明します。検証結果自体は表示されません。最初のライブラリとパイプラインの証拠は、このシリーズの論文 4 に統合されています。",
          "計算の目的: 生の配列と質の高い証拠とのつながりを失うことなく、タグ付きショートリードの集団を独立して検査可能な分子記録に変換します。"
        ]
      },
      {
        "heading": "主要トピック",
        "bullets": [
          "マーカーの位置特定、SMID の回復、分子固有のリード クラスタリング",
          "ソース遺伝子の同定と参照の検索",
          "De novo およびリファレンスガイドに基づくアセンブリ、調整、およびコンセンサス生成",
          "FASTQ 証拠から分子記録までの実行固有の SQL 来歴"
        ]
      },
      {
        "heading": "コンテンツ",
        "bullets": [
          "入力モデルと 10 ステージのパイプライン",
          "マーカー解析、読み取りトリミング、重複排除、SMID ビニング",
          "ソース遺伝子の同定と分子アセンブリ",
          "アライメント、コンセンサス、および分析の製品",
          "実行固有の SQL レコード層と分子の来歴",
          "導入、クライアントレポート、および検証インターフェース"
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
        "PSeq マーカーの解析",
        "SMID ベースの読み取りクラスタリング",
        "ソース遺伝子の特定",
        "転写物のアセンブリとコンセンサス",
        "実行固有の SQL の出自"
      ],
      "searchKeywords": [
        "PSeq",
        "PSeq データ パイプライン",
        "FASTQ",
        "ソース分子の識別子",
        "SMID クラスタリング",
        "リファレンスガイド付きアセンブリ",
        "デノボアセンブリ",
        "RNAコンセンサス配列",
        "分子の起源"
      ]
    }
  },
  {
    "translationKey": "white-paper.initial-validation",
    "kind": "white-paper",
    "title": "PSeq 全分子 RNA シーケンス プラットフォームの初期技術検証",
    "metaTitle": "PSeq 全分子 RNA シーケンシング プラットフォームの初期技術検証 | Phaeno",
    "description": "PSeq v1 の初期証拠では、ライブラリー構造、マーカー配置、SMID グループ化された転写産物アセンブリ、PRPF31 フェージング、および raw リードからコンセンサスまでのトレーサビリティが検査されます。",
    "eyebrow": "Phaeno ホワイトペーパー",
    "lead": "PSeq v1 の初期証拠では、ライブラリー構造、マーカー配置、SMID グループ化された転写産物アセンブリ、PRPF31 フェージング、および raw リードからコンセンサスまでのトレーサビリティが検査されます。",
    "sections": [
      {
        "heading": "抽象的な",
        "paragraphs": [
          "PSeq プラットフォームは、特殊な情報アーキテクチャを備えた DNA ライブラリを準備することから始まります。  従来の NGS ペアエンド シーケンシングは、個々の RNA を組み立てるのに必要なすべての情報を自動データ パイプラインに提供します。これらの要素が合わさって、全分子シーケンシングのための化学とデータを統合したフレームワークである PSeq Clear-Signal Architecture™ を形成します。このペーパーでは、操作チェーン全体にわたる PSeq v1 の初期技術検証について説明します。ケーススタディでは、単一の転写産物に対して集められたデータが、全ゲノム配列と RNA-Seq データを調べるために設計されたオープンソースの遺伝子ビューア (IGV) で容易に視覚化されます。遺伝子 PRPF31 からの単一の転写産物についてこの情報をステップ実行すると、他の方法では利用できない詳細レベルでパイプラインのパフォーマンスが視覚化されます。  この演習では、プラットフォームの一連の操作におけるすべてのステップの追跡可能性をさらに説明します。このホワイトペーパーは初期の技術的検証を構成するものであり、統計的に完全なプラットフォーム検証、臨床検証、または規制上のパフォーマンス分析として解釈されるものではありません。"
        ]
      },
      {
        "heading": "主要トピック",
        "bullets": [
          "Bioanalyzer ライブラリー サイズ プロファイルとマーカー位置の証拠",
          "Sanger マーカー、バーコード、チェックベース構造の確認",
          "代表的な FASTQ タグと cDNA の構造と同一遺伝子リードペアリング",
          "PRPF31 SMID-bin による単一遺伝子閉じ込めとスプライス接合フェージングの証拠",
          "未加工読み取りからコンセンサスまでのトレーサビリティと現在の検証制限"
        ]
      },
      {
        "heading": "コンテンツ",
        "bullets": [
          "ライブラリ検証の質問と証拠の概要",
          "ライブラリーのサイズ分布とマーカーの配置",
          "Sanger確認とFASTQ読み取り構成",
          "PRPF31 分子レベルのケーススタディ",
          "エクソンアライメントとエンドツーエンドのスプライス接合カバレッジ",
          "Shotgun コンセンサス アセンブリと基本レベルのエラー トレーサビリティ",
          "現在の証拠の解釈と計画されている次段階の検証"
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
        "PSeq ライブラリの品質管理",
        "マーカーの配置とSangerの確認",
        "FASTQ 読み取り構造",
        "PRPF31 分子レベルのケーススタディ",
        "エンドツーエンドのスプライス接合部の位相調整",
        "コンセンサストレーサビリティと検証限界"
      ],
      "searchKeywords": [
        "PSeq",
        "PSeq 技術検証",
        "Bioanalyzer",
        "マーカーの配置",
        "Sanger シーケンス",
        "FASTQ 読み取り構造",
        "PRPF31",
        "IGV",
        "刺身プロット",
        "SMID",
        "コンセンサスの精度"
      ]
    }
  }
]

export const japaneseWhitePapers = japaneseInputs.map(defineJapanesePage)

const publicationKeys = new Set(japaneseWhitePapers.map((page) => page.translationKey))
const missingPublications = localizedRoutePairs.filter(
  (pair) => pair.translationKey.startsWith('white-paper.') && !publicationKeys.has(pair.translationKey),
)
if (missingPublications.length > 0) {
  throw new Error(`Japanese publication data is missing: ${missingPublications.map((page) => page.translationKey).join(', ')}`)
}
