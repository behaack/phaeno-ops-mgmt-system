import { localizedRoutePairs } from './routes'
import type { LocalizedPublicationInput, LocalizedPublicationPage } from './publicationTypes'
import { brandTerms } from './brandTerms'

const pseqArchitecture = brandTerms.pseqClearSignalArchitecture

function defineGermanPage(input: LocalizedPublicationInput): LocalizedPublicationPage {
  const route = localizedRoutePairs.find((candidate) => candidate.translationKey === input.translationKey)
  if (!route) throw new Error(`Missing route pair for German page ${input.translationKey}.`)

  return {
    ...input,
    sourceLocale: 'en-US',
    sourceRevision: '2026-08-07',
    translationStatus: 'draft',
    route,
  }
}

const germanInputs: LocalizedPublicationInput[] = [
  {
    "translationKey": "white-paper.platform-overview",
    "kind": "white-paper",
    "title": "PSeq: Phased-RNA-Sequenzierung ganzer Moleküle auf Standard Short-Read NGS",
    "metaTitle": "PSeq: Phased-RNA-Sequenzierung ganzer Moleküle auf Standard Short-Read NGS | Phaeno",
    "description": "PSeq kombiniert Quellmolekül-Tagging, Paired-End-Short-Read-NGS, automatisierte Transkriptrekonstruktion und laufspezifische SQL-Datensätze für eine rückverfolgbare Gesamtmolekül-RNA-Analyse.",
    "eyebrow": "Phaeno Whitepaper",
    "lead": "PSeq kombiniert Quellmolekül-Tagging, Paired-End-Short-Read-NGS, automatisierte Transkriptrekonstruktion und laufspezifische SQL-Datensätze für eine rückverfolgbare Gesamtmolekül-RNA-Analyse.",
    "sections": [
      {
        "heading": "Abstrakt",
        "paragraphs": [
          "PSeq ist eine RNA-Sequenzierungsplattform für Forschungszwecke, die die Auflösung ganzer Moleküle und End-to-End-Phasing in die Standard-Short-Read-Next-Generation-Sequenzierung (NGS) integriert. Während der Reverse Transkription markiert ein Quellmolekül-Tagging-Reagenz jede RNA-Sequenz und eine Bibliotheksstrategie bewahrt den Tag-Marker über zufällige Fragmente hinweg. Die Paired-End-Sequenzierung läuft auf unmodifizierten Instrumenten, während eine automatisierte Pipeline Lesevorgänge nach Source Molecule Identifier (SMID) gruppiert, das Quellgen identifiziert, eine Konsenssequenz zusammenstellt und unterstützende Datensätze in einer laufspezifischen SQL-Datenbank speichert.",
          "In diesem Artikel werden das Kernproblem, die Architektur und das Betriebsmodell der Plattform vorgestellt. Es fehlen Rezepte für Betriebsreagenzien und detaillierte Validierungsergebnisse, die in Begleitdokumenten behandelt werden."
        ]
      },
      {
        "heading": "Schlüsselthemen",
        "bullets": [
          "Die Identität des Quellmoleküls wurde vor der Fragmentierung der Bibliothek festgestellt",
          "SMID-basierte Lesegruppierung und End-to-End-Transkriptrekonstruktion",
          "Gekoppelte molekulare Markierung, automatisierte Zusammenstellung und laufspezifische SQL-Datensätze",
          "Bereitstellung auf der Standard-Paired-End-Short-Read-NGS-Infrastruktur"
        ]
      },
      {
        "heading": "Inhalt",
        "bullets": [
          "Das Short-Read-Linkage-Problem",
          `${pseqArchitecture.name} und Designprinzipien`,
          "Durchgängiges Betriebsmodell",
          "Drei gekoppelte Plattformkomponenten",
          "Analyse auf Molekülebene und Rückverfolgbarkeit von Beweisen",
          "Bereitstellungsmodell, Ergebnisse und aktuelle Grenzen"
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
        "Phasenweise RNA-Sequenzierung ganzer Moleküle",
        "PSeq-Plattformarchitektur",
        "Kennzeichnung des Quellmolekülidentifikators",
        "Kurzer Überblick über den NGS-Workflow",
        "Rückverfolgbares RNA-Datenmodell"
      ],
      "searchKeywords": [
        "PSeq",
        "Ganzmolekül-RNA-Sequenzierung",
        "phasenweise RNA-Sequenzierung",
        "kurz lesen NGS",
        "Quellmolekülidentifikator",
        "SMID",
        "Strang-Sense-Diskriminator",
        "Transkriptrekonstruktion",
        "laufspezifische SQL-Datenbank"
      ]
    }
  },
  {
    "translationKey": "white-paper.molecular-tagging",
    "kind": "white-paper",
    "title": "PSeq Molekulares Tagging und Bibliotheksarchitektur",
    "metaTitle": "PSeq Molekulares Tagging und Bibliotheksarchitektur | Phaeno",
    "description": "Designprinzipien zur Wahrung der Quellmolekülidentität und des Strangsinns.",
    "eyebrow": "Phaeno Whitepaper",
    "lead": "Designprinzipien zur Wahrung der Quellmolekülidentität und des Strangsinns.",
    "sections": [
      {
        "heading": "Abstrakt",
        "paragraphs": [
          "Die Rekonstruktion ganzer Moleküle aus kurzen Lesevorgängen erfordert mehr als nur Sequenzierungstiefe: Die Fragmente müssen eine zuverlässige Verbindung zu dem Molekül aufrechterhalten, aus dem sie stammen. PSeq erfüllt diese Anforderung durch die Einführung eines multifunktionalen Tags während der Reverse Transkription und die Neuverteilung seines Markers unter zufälligen Fragmenten, die aus der markierten cDNA generiert werden. Der Marker trägt einen hochdiversen Source Molecule Identifier (SMID), feste Sequenzmarkierungen und Strang-Sense-Informationen, die nach der Paired-End-Sequenzierung erkannt werden können.",
          "In diesem Artikel werden das molekulare Design und die erwartete Lesestruktur der PSeq-Bibliothek beschrieben. Es handelt sich um eine Architekturbeschreibung, nicht um ein Reagenzrezept oder einen Validierungsbericht. Detaillierte Kit-Zusammensetzungen und Betriebsabläufe bleiben in kontrollierten SOPs; Die technischen Nachweise für die Validierung sind in Papier 4 dieser Reihe konsolidiert.",
          "Designziel: Fragmentieren Sie eine Quell-cDNA in eine herkömmliche Short-Read-Bibliothek, ohne die Identität oder den Strangsinn des RNA-Moleküls zu verlieren, aus dem jedes Fragment stammt."
        ]
      },
      {
        "heading": "Schlüsselthemen",
        "bullets": [
          "SMID-Barcodes, Wrapper und invariante Prüfbasen mit hoher Diversität",
          "Strang-Sense-Diskriminatoren und maschinenerkennbares Markierungsdesign",
          "Intramolekulare Fragmentierung und Markertransfer",
          "Paired-End-Lesestruktur und die Chemie-zu-Pipeline-Schnittstelle"
        ]
      },
      {
        "heading": "Inhalt",
        "bullets": [
          "Das Problem der Identitätserhaltung",
          "Anatomie des PSeq-Tags",
          "Quellmolekülidentifikator, Wrapper, Check-Base und Strang-Sense-Design",
          "Von der RNA-Markierung bis zur Paired-End-DNA-Bibliothek PSeq",
          "Erwarteter Sequenzierungs-Lesevertrag",
          "Designvarianten, Pipeline-Schnittstellen und kontrollierte SOP-Grenzen"
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
        "Markierung von Quellmolekülen",
        "SMID Barcode-Architektur",
        "Strang-Sense-Diskriminatoren",
        "Aufbau der PSeq-Bibliothek",
        "Paired-End-Lesestruktur"
      ],
      "searchKeywords": [
        "PSeq",
        "molekulare Markierung",
        "Quellmolekülidentifikator",
        "SMID",
        "Strang-Sense-Diskriminator",
        "markierte cDNA",
        "intramolekulare Fragmentierung",
        "Paired-End-Sequenzierung"
      ]
    }
  },
  {
    "translationKey": "white-paper.data-pipeline",
    "kind": "white-paper",
    "title": "PSeq Datenpipeline",
    "metaTitle": "PSeq Datenpipeline | Phaeno",
    "description": "Struktur der DNA-Bibliothek ● Computergestützte Zusammenstellung ● Datenrückverfolgbarkeit",
    "eyebrow": "Phaeno Whitepaper",
    "lead": "Struktur der DNA-Bibliothek ● Computergestützte Zusammenstellung ● Datenrückverfolgbarkeit",
    "sections": [
      {
        "heading": "Abstrakt",
        "paragraphs": [
          "Die PSeq-Datenpipeline ist darauf ausgelegt, Paired-End-Short-Reads aus einer markierten RNA-Bibliothek in molekülspezifische Transkriptdatensätze umzuwandeln. Es beginnt mit der Lokalisierung des PSeq-Marker-Tags, der Wiederherstellung des Quellmolekülidentifikators (SMID) und des Strangsignals sowie der Gruppierung von Lesevorgängen, die von einem markierten Reverse-Transkript stammen. Innerhalb jedes molekularen Behälters identifiziert und ruft die Pipeline die Sequenz des Quellgens ab, stellt die Sequenz zusammen, erstellt Alignment-Produkte und zeichnet die Beweiskette in einer laufspezifischen SQL-Datenbank auf.",
          "In diesem Dokument werden die Computerarchitektur, die Datenprodukte, das Bereitstellungsmodell und die Herkunftsstrategie beschrieben. Die Validierungsergebnisse selbst werden nicht dargestellt; Die ersten Beweise aus Bibliothek und Pipeline werden in Artikel 4 dieser Reihe konsolidiert.",
          "Rechenziel: Verwandeln Sie eine Population markierter kurzer Lesevorgänge in unabhängig überprüfbare molekulare Aufzeichnungen, ohne die Verbindung zur Rohsequenz und zum Qualitätsnachweis zu verlieren."
        ]
      },
      {
        "heading": "Schlüsselthemen",
        "bullets": [
          "Markerlokalisierung, SMID-Wiederherstellung und molekülspezifisches Lese-Clustering",
          "Identifizierung des Quellgens und Referenzabruf",
          "De-novo- und referenzbasierte Zusammenstellung, Ausrichtung und Konsensgenerierung",
          "Laufspezifische SQL-Herkunft vom FASTQ-Beweis bis hin zu molekularen Datensätzen"
        ]
      },
      {
        "heading": "Inhalt",
        "bullets": [
          "Eingabemodell und zehnstufige Pipeline",
          "Marker-Parsing, Lesetrimmung, Deduplizierung und SMID-Binning",
          "Identifizierung des Quellgens und Molekülassemblierung",
          "Ausrichtungs-, Konsens- und Analyseprodukte",
          "Laufspezifische SQL-Datensatzebenen und molekulare Herkunft",
          "Bereitstellungs-, Client-Reporting- und Validierungsschnittstelle"
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
        "PSeq-Marker-Parsing",
        "SMID-basiertes Lese-Clustering",
        "Identifizierung des Ursprungsgens",
        "Zusammenstellen des Transkripts und Konsens",
        "Laufspezifische SQL-Herkunft"
      ],
      "searchKeywords": [
        "PSeq",
        "PSeq-Datenpipeline",
        "FASTQ",
        "Quellmolekülidentifikator",
        "SMID-Clustering",
        "Referenzgeführte Montage",
        "De-novo-Versammlung",
        "RNA-Konsensussequenz",
        "molekulare Herkunft"
      ]
    }
  },
  {
    "translationKey": "white-paper.initial-validation",
    "kind": "white-paper",
    "title": "Erste technische Validierung der PSeq Whole-Molecule RNA Sequencing Platform",
    "metaTitle": "Erste technische Validierung der PSeq Whole-Molecule RNA Sequencing Platform | Phaeno",
    "description": "Die ersten Erkenntnisse von PSeq v1 untersuchen die Bibliotheksstruktur, die Markerplatzierung, die Zusammenstellung von SMID-gruppierten Transkripten, die PRPF31-Phaseneinteilung und die Rückverfolgbarkeit von Raw-Read-to-Consensus.",
    "eyebrow": "Phaeno Whitepaper",
    "lead": "Die ersten Erkenntnisse von PSeq v1 untersuchen die Bibliotheksstruktur, die Markerplatzierung, die Zusammenstellung von SMID-gruppierten Transkripten, die PRPF31-Phaseneinteilung und die Rückverfolgbarkeit von Raw-Read-to-Consensus.",
    "sections": [
      {
        "heading": "Abstrakt",
        "paragraphs": [
          "Die PSeq-Plattform beginnt mit der Vorbereitung von DNA-Bibliotheken mit einer speziellen Informationsarchitektur.  Die herkömmliche NGS-Paired-End-Sequenzierung versorgt die automatisierte Datenpipeline dann mit allen Informationen, die zum Zusammenbau jeder einzelnen RNA erforderlich sind. Zusammen bilden diese Elemente die PSeq Clear-Signal Architecture™, ein integriertes Chemie-zu-Daten-Framework für die Sequenzierung ganzer Moleküle. In diesem Dokument wird die erste technische Validierung für PSeq v1 über die gesamte Betriebskette hinweg vorgestellt. In einer Fallstudie werden für ein einzelnes Transkript zusammengestellte Daten einfach mit einem Open-Source-Gen-Viewer (IGV) visualisiert, der für die Untersuchung von Gesamtgenomsequenzen und RNA-Seq-Daten entwickelt wurde. Die Durchsicht dieser Informationen für ein einzelnes Transkript des Gens PRPF31 visualisiert die Pipeline-Leistung auf einer Detailebene, die sonst nicht verfügbar wäre.  Diese Übung verdeutlicht zusätzlich die Rückverfolgbarkeit aller Schritte in der Plattform-Betriebskette. Dieses Whitepaper stellt eine erste technische Validierung dar und ist nicht als statistisch vollständige Plattformvalidierung, klinische Validierung oder regulatorische Leistungsanalyse zu verstehen."
        ]
      },
      {
        "heading": "Schlüsselthemen",
        "bullets": [
          "Bioanalyzer Profile in Bibliotheksgröße und Nachweis der Markierungsposition",
          "Sanger Bestätigung der Markierung, des Barcodes und der Scheckbasisstruktur",
          "Repräsentative FASTQ-Tag-plus-cDNA-Struktur und Lesepaarung desselben Gens",
          "PRPF31 SMID-bin-Beweis für Einzelgenbeschränkung und Spleißverbindungsphasen",
          "Rückverfolgbarkeit von Rohdaten zum Konsens und aktuelle Validierungsgrenzen"
        ]
      },
      {
        "heading": "Inhalt",
        "bullets": [
          "Fragen zur Bibliotheksvalidierung und Zusammenfassung der Beweise",
          "Größenverteilung der Bibliothek und Platzierung der Markierungen",
          "Sanger-Bestätigung und FASTQ-Lesezusammensetzung",
          "PRPF31-Fallstudie auf Molekülebene",
          "Exon-Ausrichtung und End-to-End-Spleißverbindungsabdeckung",
          "Konsenszusammenstellung für Schrotflinten und Rückverfolgbarkeit von Fehlern auf Basisebene",
          "Interpretation aktueller Erkenntnisse und geplante Validierung in der nächsten Phase"
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
        "Qualitätskontrolle der PSeq-Bibliothek",
        "Markierungsplatzierung und Sanger-Bestätigung",
        "FASTQ Lesestruktur",
        "PRPF31-Fallstudie auf Molekülebene",
        "Durchgängige Spleiß-Übergangs-Phaseneinstellung",
        "Konsens-Rückverfolgbarkeit und Validierungsgrenzen"
      ],
      "searchKeywords": [
        "PSeq",
        "Technische Validierung PSeq",
        "Bioanalyzer",
        "Markierungsplatzierung",
        "Sanger-Sequenzierung",
        "FASTQ Lesestruktur",
        "PRPF31",
        "IGV",
        "Sashimi-Plot",
        "SMID",
        "Konsensgenauigkeit"
      ]
    }
  }
]

export const germanWhitePapers = germanInputs.map(defineGermanPage)

const publicationKeys = new Set(germanWhitePapers.map((page) => page.translationKey))
const missingPublications = localizedRoutePairs.filter(
  (pair) => pair.translationKey.startsWith('white-paper.') && !publicationKeys.has(pair.translationKey),
)
if (missingPublications.length > 0) {
  throw new Error(`German publication data is missing: ${missingPublications.map((page) => page.translationKey).join(', ')}`)
}
