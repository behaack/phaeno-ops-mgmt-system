import { localizedRoutePairs } from './routes'
import type { LocalizedPublicationInput, LocalizedPublicationPage } from './publicationTypes'

function defineSpanishPage(input: LocalizedPublicationInput): LocalizedPublicationPage {
  const route = localizedRoutePairs.find((candidate) => candidate.translationKey === input.translationKey)
  if (!route) throw new Error(`Missing route pair for Spanish page ${input.translationKey}.`)

  return {
    ...input,
    sourceLocale: 'en-US',
    sourceRevision: '2026-08-07',
    translationStatus: 'draft',
    route,
  }
}

const spanishInputs: LocalizedPublicationInput[] = [
  {
    "translationKey": "white-paper.platform-overview",
    "kind": "white-paper",
    "title": "PSeq: Secuenciación de ARN en fases de molécula completa en NGS de lectura corta estándar",
    "metaTitle": "PSeq: Secuenciación de ARN en fases de molécula completa en NGS estándar de lectura corta | Phaeno",
    "description": "PSeq combina etiquetado de molécula fuente, lectura corta de extremo emparejado NGS, reconstrucción de transcripción automatizada y registros SQL específicos de ejecución para un análisis de ARN de molécula completa rastreable.",
    "eyebrow": "Documento técnico Phaeno",
    "lead": "PSeq combina etiquetado de molécula fuente, lectura corta de extremo emparejado NGS, reconstrucción de transcripción automatizada y registros SQL específicos de ejecución para un análisis de ARN de molécula completa rastreable.",
    "sections": [
      {
        "heading": "Abstracto",
        "paragraphs": [
          "PSeq es una plataforma de secuenciación de ARN para uso en investigación que brinda resolución de molécula completa y fase de extremo a extremo a la secuenciación estándar de próxima generación de lectura corta (NGS). Durante la transcripción inversa, un reactivo de etiquetado de molécula fuente marca cada secuencia de ARN y una estrategia de biblioteca preserva el marcador en fragmentos aleatorios. La secuenciación de extremos emparejados se ejecuta en instrumentos no modificados, mientras que una canalización automatizada agrupa lecturas por identificador de molécula de origen (SMID), identifica el gen de origen, ensambla una secuencia de consenso y conserva registros de respaldo en una base de datos SQL específica de la ejecución.",
          "Este artículo presenta el problema central, la arquitectura y el modelo operativo de la plataforma. Omite recetas de reactivos operativos y resultados de validación detallados, que se tratan en documentos complementarios."
        ]
      },
      {
        "heading": "Temas clave",
        "bullets": [
          "Identidad de la molécula fuente establecida antes de la fragmentación de la biblioteca",
          "Agrupación de lecturas basada en SMID y reconstrucción de transcripciones de un extremo a otro",
          "Etiquetado molecular acoplado, ensamblaje automatizado y registros SQL específicos de ejecución",
          "Implementación en infraestructura estándar NGS de lectura corta de extremo emparejado"
        ]
      },
      {
        "heading": "Contenido",
        "bullets": [
          "El problema del enlace de lectura corta",
          "PSeq Arquitectura de señal clara y principios de diseño",
          "Modelo operativo de extremo a extremo",
          "Tres componentes de plataforma acoplados",
          "Análisis a nivel molecular y trazabilidad de evidencia.",
          "Modelo de implementación, entregables y límites actuales"
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
        "Secuenciación de ARN en fases de molécula completa",
        "Arquitectura de plataforma PSeq",
        "Etiquetado del identificador de molécula de origen",
        "Flujo de trabajo de lectura corta NGS",
        "Modelo de datos de ARN rastreable"
      ],
      "searchKeywords": [
        "PSeq",
        "secuenciación de ARN de molécula completa",
        "secuenciación de ARN en fases",
        "lectura corta NGS",
        "Identificador de molécula fuente",
        "SMID",
        "discriminador de sentido de hebra",
        "reconstrucción de transcripción",
        "base de datos SQL específica de ejecución"
      ]
    }
  },
  {
    "translationKey": "white-paper.molecular-tagging",
    "kind": "white-paper",
    "title": "Arquitectura de biblioteca y etiquetado molecular PSeq",
    "metaTitle": "PSeq Arquitectura de biblioteca y etiquetado molecular | Phaeno",
    "description": "Principios de diseño para preservar la identidad fuente-molécula y el sentido de la cadena.",
    "eyebrow": "Documento técnico Phaeno",
    "lead": "Principios de diseño para preservar la identidad fuente-molécula y el sentido de la cadena.",
    "sections": [
      {
        "heading": "Abstracto",
        "paragraphs": [
          "La reconstrucción de moléculas completas a partir de lecturas breves requiere más que la profundidad de la secuenciación: los fragmentos deben conservar una conexión confiable con la molécula de la que se originaron. PSeq aborda ese requisito introduciendo una etiqueta multifuncional durante la transcripción inversa y redistribuyendo su marcador entre fragmentos aleatorios generados a partir del ADNc etiquetado. El marcador lleva un identificador de molécula fuente de alta diversidad (SMID), puntos de referencia de secuencia fijos e información de sentido de cadena que se puede reconocer después de la secuenciación de extremos emparejados.",
          "Este artículo describe el diseño molecular y la estructura de lectura esperada de la biblioteca PSeq. Es una descripción arquitectónica, no una receta de reactivo ni un informe de validación. Las composiciones detalladas de los kits y los procedimientos operativos permanecen en POE controlados; La evidencia técnica para la validación se consolida en el Documento 4 de esta serie.",
          "Objetivo de diseño: fragmentar un ADNc fuente en una biblioteca convencional de lectura corta sin perder la identidad o el sentido de la cadena de la molécula de ARN de la que surgió cada fragmento."
        ]
      },
      {
        "heading": "Temas clave",
        "bullets": [
          "Códigos de barras, envoltorios y bases de cheques invariantes SMID de alta diversidad",
          "Discriminadores por sentido de hebra y diseño de marcadores reconocibles por máquinas",
          "Fragmentación intramolecular y transferencia de marcadores.",
          "Estructura de lectura de pares y la interfaz de química a tubería"
        ]
      },
      {
        "heading": "Contenido",
        "bullets": [
          "El problema de la preservación de la identidad",
          "Anatomía de la etiqueta PSeq",
          "Identificador de molécula fuente, diseño de envoltura, base de verificación y sentido de hebra",
          "Del etiquetado de ARN a una biblioteca de ADN PSeq de extremos emparejados",
          "Contrato de lectura de secuenciación esperado",
          "Variantes de diseño, interfaces de tuberías y límites controlados de SOP"
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
        "Etiquetado de moléculas fuente",
        "Arquitectura de código de barras SMID",
        "Discriminadores de sentido de hebra",
        "Construcción de biblioteca PSeq",
        "Estructura de lectura de pares"
      ],
      "searchKeywords": [
        "PSeq",
        "etiquetado molecular",
        "Identificador de molécula fuente",
        "SMID",
        "discriminador de sentido de hebra",
        "ADNc etiquetado",
        "fragmentación intramolecular",
        "secuenciación de extremos emparejados"
      ]
    }
  },
  {
    "translationKey": "white-paper.data-pipeline",
    "kind": "white-paper",
    "title": "Tubería de datos PSeq",
    "metaTitle": "Tubería de datos PSeq | Phaeno",
    "description": "Estructura de la biblioteca de ADN ● Ensamblaje computacional ● Trazabilidad de datos",
    "eyebrow": "Documento técnico Phaeno",
    "lead": "Estructura de la biblioteca de ADN ● Ensamblaje computacional ● Trazabilidad de datos",
    "sections": [
      {
        "heading": "Abstracto",
        "paragraphs": [
          "La canalización de datos PSeq está diseñada para transformar lecturas cortas de extremos emparejados de una biblioteca de ARN etiquetada en registros de transcripción específicos de moléculas. Comienza localizando la etiqueta marcadora PSeq, recuperando el identificador de la molécula de origen (SMID) y la señal de la cadena, y agrupando las lecturas que se originaron a partir de una transcripción inversa etiquetada. Dentro de cada contenedor molecular, la canalización identifica y recupera la secuencia del gen fuente, ensambla la secuencia, crea productos de alineación y registra la cadena de evidencia en una base de datos SQL específica de la ejecución.",
          "Este artículo describe la arquitectura computacional, los productos de datos, el modelo de implementación y la estrategia de procedencia. No presenta los resultados de la validación propiamente dichos; La evidencia inicial de biblioteca y canalización se consolida en el documento 4 de esta serie.",
          "Objetivo computacional: convertir una población de lecturas breves etiquetadas en registros moleculares inspeccionables de forma independiente sin perder la conexión con la secuencia sin procesar y la evidencia de calidad."
        ]
      },
      {
        "heading": "Temas clave",
        "bullets": [
          "Localización de marcadores, recuperación de SMID y agrupación de lecturas específicas de moléculas",
          "Identificación del gen fuente y recuperación de referencia.",
          "Asamblea, alineación y generación de consenso de novo y guiadas por referencias",
          "Procedencia SQL específica de ejecución desde evidencia FASTQ hasta registros moleculares"
        ]
      },
      {
        "heading": "Contenido",
        "bullets": [
          "Modelo de entrada y canalización de diez etapas.",
          "Análisis de marcadores, recorte de lectura, deduplicación y agrupación SMID",
          "Identificación del gen fuente y ensamblaje de moléculas.",
          "Productos de alineación, consenso y análisis.",
          "Capas de registros SQL específicas de ejecución y procedencia molecular",
          "Interfaz de implementación, informes de clientes y validación"
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
        "Análisis de marcadores PSeq",
        "Agrupación de lectura basada en SMID",
        "Identificación del gen fuente",
        "Asamblea y consenso de transcripción",
        "Procedencia SQL específica de ejecución"
      ],
      "searchKeywords": [
        "PSeq",
        "Tubería de datos PSeq",
        "FASTQ",
        "Identificador de molécula fuente",
        "Agrupación SMID",
        "montaje guiado por referencia",
        "asamblea de novo",
        "Secuencia consenso de ARN",
        "procedencia molecular"
      ]
    }
  },
  {
    "translationKey": "white-paper.initial-validation",
    "kind": "white-paper",
    "title": "Validación técnica inicial de la plataforma de secuenciación de ARN de molécula completa PSeq",
    "metaTitle": "Validación técnica inicial de la plataforma de secuenciación de ARN de molécula completa PSeq | Phaeno",
    "description": "La evidencia inicial de PSeq v1 examina la estructura de la biblioteca, la ubicación de los marcadores, el ensamblaje de transcripciones agrupadas por SMID, la fase de PRPF31 y la trazabilidad de la lectura sin procesar hasta el consenso.",
    "eyebrow": "Documento técnico Phaeno",
    "lead": "La evidencia inicial de PSeq v1 examina la estructura de la biblioteca, la ubicación de los marcadores, el ensamblaje de transcripciones agrupadas por SMID, la fase de PRPF31 y la trazabilidad de la lectura sin procesar hasta el consenso.",
    "sections": [
      {
        "heading": "Abstracto",
        "paragraphs": [
          "La plataforma PSeq comienza con la preparación de bibliotecas de ADN con una arquitectura informativa especializada.  La secuenciación convencional de extremos emparejados NGS proporciona al canal de datos automatizado toda la información necesaria para ensamblar cada ARN individual. Juntos, estos elementos forman PSeq Clear-Signal Architecture™, un marco integrado de química a datos para la secuenciación de moléculas completas. Este documento presenta la validación técnica inicial de PSeq v1 en toda la cadena de operaciones. En un estudio de caso, los datos reunidos para una única transcripción se visualizan fácilmente con un visor de genes de código abierto (IGV) diseñado para examinar secuencias del genoma completo y datos de RNA-Seq. Al revisar esta información para una única transcripción del gen PRPF31 se visualiza el rendimiento de la tubería con un nivel de detalle que de otro modo no estaría disponible.  Este ejercicio ilustra aún más la trazabilidad de todos los pasos en la cadena de operación de la plataforma. Este documento técnico constituye una validación técnica inicial y no debe interpretarse como una validación de plataforma estadísticamente completa, una validación clínica ni un análisis de desempeño regulatorio."
        ]
      },
      {
        "heading": "Temas clave",
        "bullets": [
          "Perfiles del tamaño de biblioteca Bioanalyzer y evidencia de posición de marcador",
          "Confirmación Sanger de marcador, código de barras y estructura de base de verificación",
          "Estructura representativa de etiqueta FASTQ más ADNc y emparejamiento de lectura del mismo gen",
          "Evidencia de PRPF31 SMID-bin para el confinamiento de un solo gen y la fase de empalme y unión",
          "Trazabilidad de lectura sin formato hasta el consenso y límites de validación actuales"
        ]
      },
      {
        "heading": "Contenido",
        "bullets": [
          "Preguntas de validación de la biblioteca y resumen de evidencia",
          "Distribución del tamaño de la biblioteca y colocación de marcadores.",
          "Confirmación de Sanger y composición de lectura de FASTQ",
          "Estudio de caso a nivel de molécula PRPF31",
          "Alineación de exones y cobertura de uniones de empalme de extremo a extremo",
          "Asamblea de consenso de escopeta y trazabilidad de errores a nivel básico",
          "Interpretación de la evidencia actual y validación planificada para la próxima fase."
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
        "Control de calidad de la biblioteca PSeq",
        "Colocación del marcador y confirmación de Sanger",
        "Estructura de lectura FASTQ",
        "Estudio de caso a nivel de molécula PRPF31",
        "Fase de unión de empalme de extremo a extremo",
        "Trazabilidad consensuada y límites de validación"
      ],
      "searchKeywords": [
        "PSeq",
        "Validación técnica PSeq",
        "Bioanalyzer",
        "colocación del marcador",
        "Secuenciación Sanger",
        "Estructura de lectura FASTQ",
        "PRPF31",
        "IGV",
        "Trama de sashimi",
        "SMID",
        "precisión del consenso"
      ]
    }
  }
]

export const spanishWhitePapers = spanishInputs.map(defineSpanishPage)

const publicationKeys = new Set(spanishWhitePapers.map((page) => page.translationKey))
const missingPublications = localizedRoutePairs.filter(
  (pair) => pair.translationKey.startsWith('white-paper.') && !publicationKeys.has(pair.translationKey),
)
if (missingPublications.length > 0) {
  throw new Error(`Spanish publication data is missing: ${missingPublications.map((page) => page.translationKey).join(', ')}`)
}
