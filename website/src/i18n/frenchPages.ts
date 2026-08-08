import type { LocalizedPublicationInput, LocalizedPublicationPage } from './publicationTypes'
import { localizedRoutePairs } from './routes'

function defineFrenchPage(input: LocalizedPublicationInput): LocalizedPublicationPage {
  const route = localizedRoutePairs.find((candidate) => candidate.translationKey === input.translationKey)
  if (!route) throw new Error(`Missing route pair for French page ${input.translationKey}.`)

  return {
    ...input,
    sourceLocale: 'en-US',
    sourceRevision: '2026-08-07',
    translationStatus: 'draft',
    route,
  }
}

export const frenchWhitePapers: LocalizedPublicationPage[] = [
  defineFrenchPage({
    translationKey: 'white-paper.platform-overview',
    kind: 'white-paper',
    title: 'PSeq : séquençage phasé de l’ARN au niveau moléculaire sur des plateformes NGS standard',
    metaTitle: 'PSeq : séquençage de l’ARN au niveau moléculaire | Phaeno',
    description: 'PSeq associe le marquage des molécules sources, le NGS paired-end, la reconstruction automatisée des transcrits et des dossiers SQL propres à chaque analyse pour une analyse traçable de l’ARN.',
    eyebrow: 'Livre blanc Phaeno',
    lead: 'PSeq transforme des lectures courtes en dossiers de transcrits pleine longueur, molécule par molécule, au moyen d’un flux associant chimie, séquençage et traitement des données.',
    sections: [
      {
        heading: 'Résumé',
        paragraphs: [
          'PSeq est une plateforme intégrée de chimie et de traitement des données, conçue pour préserver l’identité de chaque molécule d’ARN au cours d’un flux NGS à lectures courtes. Pendant la transcription inverse, un réactif spécialisé marque la molécule source de chaque séquence d’ARN, et la stratégie de bibliothèque conserve la signature du marqueur dans les fragments aléatoires. Le séquençage paired-end fonctionne sur des instruments non modifiés, tandis qu’un pipeline automatisé regroupe les lectures selon l’identifiant de molécule source (SMID), détermine le gène d’origine, construit une séquence consensus et conserve les données justificatives dans une base SQL propre à chaque analyse.',
          'Ce livre blanc présente le problème fondamental auquel répond la plateforme, son architecture et son modèle opérationnel. Il ne contient ni recette de réactifs ni résultats détaillés de validation, qui sont traités dans les documents complémentaires.',
        ],
      },
      {
        heading: 'Sujets principaux',
        bullets: [
          'Établissement de l’identité de la molécule source avant la fragmentation',
          'Regroupement par SMID et reconstruction des transcrits',
          'Intégration du marquage moléculaire, de l’assemblage automatisé et des dossiers SQL',
          'Fonctionnement sur une infrastructure NGS standard',
        ],
      },
      {
        heading: 'Sommaire',
        bullets: [
          'Le problème de liaison dans les lectures courtes',
          'Architecture Clear-Signal et principes de conception de PSeq',
          'Modèle opérationnel de bout en bout',
          'Trois composants de plateforme interconnectés',
          'Analyse au niveau moléculaire et traçabilité des preuves',
          'Modèle de déploiement, résultats et limites actuelles',
        ],
      },
    ],
    whitePaper: {
      pdfPath: '/white-papers/pseq-technical-whitepaper-part-1-platform-overview.pdf',
      image: '/images/media/white-papers/pseq-technical-white-paper.png',
      date: '2026-07-31',
      pageCount: 7,
      version: '1.0',
      topics: ['Séquençage phasé de l’ARN au niveau moléculaire', 'Architecture de la plateforme PSeq', 'Marquage par identifiant de molécule source', 'Flux NGS à lectures courtes', 'Modèle de données ARN traçable'],
      searchKeywords: ['PSeq', 'séquençage ARN', 'SMID', 'NGS', 'reconstruction des transcrits'],
    },
  }),
  defineFrenchPage({
    translationKey: 'white-paper.molecular-tagging',
    kind: 'white-paper',
    title: 'Marquage moléculaire et architecture de bibliothèque PSeq',
    metaTitle: 'Marquage moléculaire et bibliothèque PSeq | Phaeno',
    description: 'Principes de conception qui préservent l’identité de la molécule source et l’orientation du brin dans les bibliothèques PSeq.',
    eyebrow: 'Livre blanc Phaeno',
    lead: 'Ce document décrit la conception moléculaire et l’architecture de lecture attendue d’une bibliothèque PSeq ; il ne constitue ni une recette de réactifs ni un rapport de validation.',
    sections: [
      {
        heading: 'Résumé',
        paragraphs: [
          'Reconstruire une molécule complète à partir de lectures courtes nécessite davantage qu’une grande profondeur de séquençage : les fragments doivent conserver un lien fiable avec leur molécule d’origine. PSeq répond à cette exigence en introduisant un marqueur multifonctionnel pendant la transcription inverse, puis en redistribuant sa signature parmi les fragments aléatoires issus de l’ADNc marqué. Cette signature contient un identifiant de molécule source (SMID) à forte diversité, des caractéristiques de séquence fixes et des informations sur l’orientation du brin reconnaissables après séquençage paired-end.',
          'Ce livre blanc décrit la conception moléculaire et l’architecture de lecture attendue d’une bibliothèque PSeq. Il s’agit d’une description architecturale et non d’une recette de réactifs ni d’un rapport de validation. Les formulations détaillées des kits et les procédures restent dans des modes opératoires contrôlés, tandis que les données techniques de validation sont réunies dans le quatrième document de cette série.',
        ],
      },
      {
        heading: 'Objectif de conception',
        paragraphs: ['Fragmenter l’ADNc source en une bibliothèque conventionnelle à lectures courtes sans perdre l’identité de la molécule d’ARN à l’origine de chaque fragment ni l’orientation de son brin.'],
      },
      {
        heading: 'Sujets principaux',
        bullets: ['Codes-barres SMID à forte diversité', 'Discriminateurs d’orientation du brin', 'Fragmentation intramoléculaire et transfert du marqueur', 'Architecture de lecture paired-end et interface entre chimie et pipeline de données'],
      },
      {
        heading: 'Sommaire',
        bullets: ['Le problème de la préservation de l’identité', 'Anatomie du marqueur PSeq', 'Conception du SMID, de l’enveloppe, de la base de vérification et de l’orientation du brin', 'De l’ARN marqué à la bibliothèque d’ADN PSeq double brin', 'Contrat d’architecture des lectures de séquençage attendues', 'Variantes de conception, interfaces du pipeline et limites des procédures contrôlées'],
      },
    ],
    whitePaper: {
      pdfPath: '/white-papers/pseq-technical-whitepaper-part-2-molecular-tagging.pdf',
      image: '/images/media/white-papers/pseq-technical-white-paper.png',
      date: '2026-07-31',
      pageCount: 5,
      version: '1.0',
      topics: ['Marquage de la molécule source', 'Architecture du code-barres SMID', 'Orientation du brin', 'Construction de bibliothèque PSeq', 'Architecture de lecture paired-end'],
      searchKeywords: ['PSeq', 'marquage moléculaire', 'SMID', 'ADNc', 'séquençage paired-end'],
    },
  }),
  defineFrenchPage({
    translationKey: 'white-paper.data-pipeline',
    kind: 'white-paper',
    title: 'Pipeline de données PSeq',
    metaTitle: 'Pipeline de données PSeq | Phaeno',
    description: 'Architecture de bibliothèque d’ADN, assemblage informatique et traçabilité des données dans le pipeline PSeq.',
    eyebrow: 'Livre blanc Phaeno',
    lead: 'Le pipeline transforme les lectures paired-end d’une bibliothèque d’ARN marquée en dossiers de transcrits propres à chaque molécule, tout en maintenant les preuves reliées aux données FASTQ d’origine.',
    sections: [
      {
        heading: 'Résumé',
        paragraphs: [
          'Le pipeline de données PSeq est conçu pour transformer les lectures courtes paired-end d’une bibliothèque d’ARN marquée en dossiers de transcrits propres à chaque molécule. Il commence par localiser la signature PSeq et récupérer l’identifiant de molécule source (SMID) ainsi que le signal d’orientation du brin, puis regroupe les lectures provenant de la même transcription inverse marquée. Dans chaque groupe moléculaire, le pipeline détermine le gène source, récupère sa séquence, assemble la séquence, génère les résultats d’alignement et consigne la chaîne de preuves dans une base SQL propre à l’analyse.',
          'Ce livre blanc décrit l’architecture informatique, les produits de données, le modèle de déploiement et la stratégie de provenance. Il ne présente pas les résultats de validation eux-mêmes ; les données initiales de validation de la bibliothèque et du pipeline sont réunies dans le quatrième document de cette série.',
        ],
      },
      {
        heading: 'Objectif informatique',
        paragraphs: ['Transformer un ensemble de lectures courtes marquées en dossiers moléculaires pouvant être inspectés indépendamment, sans perdre le lien avec les données brutes de séquençage et les preuves de qualité.'],
      },
      {
        heading: 'Sujets principaux',
        bullets: ['Localisation du marqueur et récupération du SMID', 'Regroupement des lectures par molécule', 'Assemblage avec et sans référence', 'Génération de la séquence consensus', 'Provenance moléculaire du FASTQ au dossier final'],
      },
      {
        heading: 'Sommaire',
        bullets: ['Modèle d’entrée et pipeline en dix étapes', 'Analyse des marqueurs, rognage des lectures, déduplication et partitionnement des SMID', 'Détermination du gène source et assemblage moléculaire', 'Alignement, consensus et résultats d’analyse', 'Couches de dossiers SQL propres à l’analyse et provenance des molécules', 'Déploiement, rapports destinés aux clients et interface de validation'],
      },
    ],
    whitePaper: {
      pdfPath: '/white-papers/pseq-technical-whitepaper-part-3-data-pipeline.pdf',
      image: '/images/media/white-papers/pseq-technical-white-paper.png',
      date: '2026-07-31',
      pageCount: 7,
      version: '1.0',
      topics: ['Analyse des marqueurs PSeq', 'Regroupement des lectures par SMID', 'Détermination du gène source', 'Assemblage des transcrits et consensus', 'Provenance des données SQL'],
      searchKeywords: ['PSeq', 'FASTQ', 'SMID', 'pipeline de données', 'assemblage ARN', 'traçabilité'],
    },
  }),
  defineFrenchPage({
    translationKey: 'white-paper.initial-validation',
    kind: 'white-paper',
    title: 'Validation technique initiale de la plateforme PSeq pour le séquençage de l’ARN au niveau moléculaire',
    metaTitle: 'Validation technique initiale de la plateforme PSeq | Phaeno',
    description: 'Les données initiales examinent la structure de la bibliothèque, la position du marqueur, le regroupement des transcrits par SMID, la liaison de PRPF31 et la traçabilité de la lecture brute à la séquence consensus.',
    eyebrow: 'Livre blanc Phaeno',
    lead: 'Ce document présente des données techniques initiales sur l’ensemble du flux PSeq et ne doit pas être interprété comme une validation statistique complète, une validation clinique ou une analyse de performance réglementaire.',
    sections: [
      {
        heading: 'Résumé',
        paragraphs: [
          'La plateforme PSeq commence par préparer des bibliothèques d’ADN dotées d’une architecture informationnelle spécialisée. Le séquençage NGS paired-end conventionnel fournit ensuite au pipeline de données automatisé toutes les informations nécessaires pour assembler séparément chaque molécule d’ARN. Ensemble, ces éléments forment l’architecture Clear-Signal™ de PSeq, un cadre intégré de la chimie aux données pour le séquençage de molécules complètes.',
          'Ce livre blanc présente une validation technique initiale de PSeq v1 sur l’ensemble de la chaîne opérationnelle. Dans une étude de cas, les données assemblées d’un seul transcrit peuvent être visualisées facilement avec IGV, le navigateur génomique open source conçu pour inspecter les séquences de génomes complets et les données RNA-Seq. L’examen des informations d’un transcrit unique du gène PRPF31 montre les performances du pipeline à un niveau de détail rarement disponible et illustre la traçabilité de toutes les étapes de la chaîne opérationnelle de la plateforme.',
          'Ce livre blanc constitue une validation technique initiale et ne doit pas être interprété comme une validation statistique complète de la plateforme, une validation clinique ou une analyse de performance réglementaire.',
        ],
      },
      {
        heading: 'Sujets principaux',
        bullets: ['Distribution de la taille des bibliothèques et position du marqueur', 'Confirmation de la structure par séquençage Sanger', 'Structure du marqueur et de l’ADNc dans les fichiers FASTQ', 'Étude de cas PRPF31 au niveau moléculaire', 'Traçabilité des erreurs de la lecture brute au consensus'],
      },
      {
        heading: 'Sommaire',
        bullets: ['Questions de validation de la bibliothèque et résumé des données', 'Distribution de la taille des bibliothèques et position du marqueur', 'Confirmation Sanger et composition des lectures FASTQ', 'Étude de cas PRPF31 au niveau moléculaire', 'Alignement des exons et couverture de bout en bout des jonctions d’épissage', 'Assemblage shotgun du consensus et traçabilité des erreurs au niveau des bases', 'Interprétation des données actuelles et validation prévue pour la phase suivante'],
      },
    ],
    whitePaper: {
      pdfPath: '/white-papers/pseq-technical-whitepaper-part-4-initial-technical-validation.pdf',
      image: '/images/media/white-papers/pseq-technical-white-paper.png',
      date: '2026-07-31',
      pageCount: 12,
      version: '1.0',
      topics: ['Contrôle qualité des bibliothèques PSeq', 'Confirmation de la position du marqueur', 'Structure FASTQ', 'Étude de cas PRPF31', 'Liaison des jonctions d’ARN', 'Traçabilité du consensus'],
      searchKeywords: ['PSeq', 'validation technique', 'Bioanalyzer', 'Sanger', 'FASTQ', 'PRPF31', 'IGV', 'SMID'],
    },
  }),
]

const publicationKeys = new Set(frenchWhitePapers.map((page) => page.translationKey))
const missingPublications = localizedRoutePairs.filter(
  (pair) => pair.translationKey.startsWith('white-paper.') && !publicationKeys.has(pair.translationKey),
)
if (missingPublications.length > 0) {
  throw new Error(`French publication data is missing: ${missingPublications.map((page) => page.translationKey).join(', ')}`)
}
