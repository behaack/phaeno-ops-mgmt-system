import { localizedRoutePairs } from './routes'
import type { LocalizedPublicationInput, LocalizedPublicationPage } from './publicationTypes'
import { brandTerms } from './brandTerms'

const pseqArchitecture = brandTerms.pseqClearSignalArchitecture

function defineItalianPage(input: LocalizedPublicationInput): LocalizedPublicationPage {
  const route = localizedRoutePairs.find((candidate) => candidate.translationKey === input.translationKey)
  if (!route) throw new Error(`Missing route pair for Italian page ${input.translationKey}.`)

  return {
    ...input,
    sourceLocale: 'en-US',
    sourceRevision: '2026-08-07',
    translationStatus: 'draft',
    route,
  }
}

const italianInputs: LocalizedPublicationInput[] = [
  {
    "translationKey": "white-paper.platform-overview",
    "kind": "white-paper",
    "title": "PSeq: sequenziamento dell'RNA in fasi di molecole intere su NGS standard a lettura breve",
    "metaTitle": "PSeq: sequenziamento dell'RNA in fasi di molecole intere su NGS standard a lettura breve | Phaeno",
    "description": "PSeq combina la codifica della molecola sorgente, NGS a lettura breve accoppiata, ricostruzione automatizzata della trascrizione e record SQL specifici dell'esecuzione per l'analisi tracciabile dell'RNA dell'intera molecola.",
    "eyebrow": "Phaeno Libro bianco",
    "lead": "PSeq combina la codifica della molecola sorgente, NGS a lettura breve accoppiata, ricostruzione automatizzata della trascrizione e record SQL specifici dell'esecuzione per l'analisi tracciabile dell'RNA dell'intera molecola.",
    "sections": [
      {
        "heading": "Astratto",
        "paragraphs": [
          "PSeq è una piattaforma di sequenziamento dell'RNA per uso di ricerca che porta la risoluzione dell'intera molecola e la fasatura end-to-end al sequenziamento standard di prossima generazione a lettura breve (NGS). Durante la trascrizione inversa, un reagente che codifica la molecola sorgente etichetta ciascuna sequenza di RNA e una strategia di libreria preserva il marcatore del tag attraverso frammenti casuali. Il sequenziamento bidirezionale viene eseguito su strumenti non modificati, mentre una pipeline automatizzata raggruppa le letture tramite Source Molecule Identifier (SMID), identifica il gene sorgente, assembla una sequenza consenso e conserva i record di supporto in un database SQL specifico per la corsa.",
          "Questo documento presenta il problema principale, l’architettura e il modello operativo della piattaforma. Omette le ricette dei reagenti operativi e i risultati dettagliati della validazione, che sono trattati nei documenti allegati."
        ]
      },
      {
        "heading": "Argomenti chiave",
        "bullets": [
          "Identità della molecola sorgente stabilita prima della frammentazione della libreria",
          "Raggruppamento di letture basato su SMID e ricostruzione della trascrizione end-to-end",
          "Etichettatura molecolare accoppiata, assemblaggio automatizzato e record SQL specifici per l'esecuzione",
          "Distribuzione su infrastruttura NGS standard a lettura breve"
        ]
      },
      {
        "heading": "Contenuto",
        "bullets": [
          "Il problema del collegamento a lettura breve",
          `${pseqArchitecture.name} e principi di progettazione`,
          "Modello operativo end-to-end",
          "Tre componenti della piattaforma accoppiati",
          "Analisi a livello molecolare e tracciabilità delle prove",
          "Modello di distribuzione, risultati finali e limiti attuali"
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
        "Sequenziamento dell'RNA in fasi di molecole intere",
        "Architettura della piattaforma PSeq",
        "Etichettatura dell'identificatore della molecola di origine",
        "Flusso di lavoro NGS a lettura breve",
        "Modello di dati di RNA tracciabile"
      ],
      "searchKeywords": [
        "PSeq",
        "sequenziamento dell'RNA dell'intera molecola",
        "sequenziamento graduale dell'RNA",
        "NGS a lettura breve",
        "Identificatore della molecola di origine",
        "SMID",
        "discriminatore del senso del filamento",
        "ricostruzione della trascrizione",
        "database SQL specifico per l'esecuzione"
      ]
    }
  },
  {
    "translationKey": "white-paper.molecular-tagging",
    "kind": "white-paper",
    "title": "PSeq Etichettatura molecolare e architettura della libreria",
    "metaTitle": "PSeq Etichettatura molecolare e architettura della libreria | Phaeno",
    "description": "Principi di progettazione per preservare l'identità della molecola sorgente e il senso del filamento.",
    "eyebrow": "Phaeno Libro bianco",
    "lead": "Principi di progettazione per preservare l'identità della molecola sorgente e il senso del filamento.",
    "sections": [
      {
        "heading": "Astratto",
        "paragraphs": [
          "La ricostruzione dell'intera molecola da letture brevi richiede più della semplice profondità di sequenziamento: i frammenti devono mantenere una connessione affidabile con la molecola da cui hanno avuto origine. PSeq soddisfa questo requisito introducendo un tag multifunzionale durante la trascrizione inversa e ridistribuendo il suo marcatore tra frammenti casuali generati dal cDNA contrassegnato. Il marcatore trasporta un identificatore della molecola sorgente ad alta diversità (SMID), punti di riferimento di sequenza fissi e informazioni sul senso del filamento che possono essere riconosciute dopo il sequenziamento bidirezionale.",
          "Questo articolo descrive la progettazione molecolare e la struttura di lettura prevista della libreria PSeq. Si tratta di una descrizione dell'architettura, non di una ricetta di reagenti o di un rapporto di convalida. Le composizioni dettagliate dei kit e le procedure operative rimangono nelle SOP controllate; le prove tecniche per la validazione sono consolidate nel Documento 4 di questa serie.",
          "Obiettivo di progettazione: frammentare un cDNA di origine in una libreria convenzionale a lettura breve senza perdere l'identità o il senso del filamento della molecola di RNA da cui ha avuto origine ciascun frammento."
        ]
      },
      {
        "heading": "Argomenti chiave",
        "bullets": [
          "Codici a barre SMID ad alta diversità, wrapper e basi di controllo invarianti",
          "Discriminatori di rilevamento del filo e design di marcatori riconoscibili dalla macchina",
          "Frammentazione intramolecolare e trasferimento di marcatori",
          "Struttura di lettura bidirezionale e interfaccia chimica-pipeline"
        ]
      },
      {
        "heading": "Contenuto",
        "bullets": [
          "Il problema della preservazione dell’identità",
          "Anatomia del tag PSeq",
          "Identificatore della molecola sorgente, design dell'involucro, della base di controllo e del senso del filamento",
          "Dalla codifica dell'RNA a una libreria di DNA PSeq a estremità accoppiate",
          "Contratto di lettura sequenziale previsto",
          "Varianti di progettazione, interfacce della pipeline e limiti SOP controllati"
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
        "Etichettatura della molecola sorgente",
        "Architettura del codice a barre SMID",
        "Discriminatori del senso del filo",
        "Costruzione della libreria PSeq",
        "Struttura di lettura bidirezionale"
      ],
      "searchKeywords": [
        "PSeq",
        "marcatura molecolare",
        "Identificatore della molecola di origine",
        "SMID",
        "discriminatore del senso del filamento",
        "contrassegnato con cDNA",
        "frammentazione intramolecolare",
        "sequenziamento bidirezionale"
      ]
    }
  },
  {
    "translationKey": "white-paper.data-pipeline",
    "kind": "white-paper",
    "title": "PSeq Pipeline di dati",
    "metaTitle": "PSeq Pipeline di dati | Phaeno",
    "description": "Struttura della libreria del DNA ● Assemblaggio computazionale ● Tracciabilità dei dati",
    "eyebrow": "Phaeno Libro bianco",
    "lead": "Struttura della libreria del DNA ● Assemblaggio computazionale ● Tracciabilità dei dati",
    "sections": [
      {
        "heading": "Astratto",
        "paragraphs": [
          "La pipeline di dati PSeq è progettata per trasformare brevi letture accoppiate da una libreria di RNA contrassegnati in record di trascrizione specifici della molecola. Inizia individuando il tag marcatore PSeq, recuperando l'identificatore della molecola sorgente (SMID) e il segnale del filamento e raggruppando le letture originate da una trascrizione inversa contrassegnata. All'interno di ciascun contenitore molecolare, la pipeline identifica e recupera la sequenza del gene sorgente, assembla la sequenza, crea prodotti di allineamento e registra la catena delle prove in un database SQL specifico per l'esecuzione.",
          "Questo documento descrive l'architettura computazionale, i prodotti dei dati, il modello di distribuzione e la strategia di provenienza. Non presenta i risultati della validazione stessa; le prove iniziali della libreria e della pipeline sono consolidate nel documento 4 di questa serie.",
          "Obiettivo computazionale: trasformare una popolazione di letture brevi contrassegnate in record molecolari ispezionabili in modo indipendente senza perdere la connessione con la sequenza grezza e le prove di qualità."
        ]
      },
      {
        "heading": "Argomenti chiave",
        "bullets": [
          "Localizzazione dei marcatori, recupero SMID e clustering di letture specifiche della molecola",
          "Identificazione del gene sorgente e recupero dei riferimenti",
          "Assemblaggio, allineamento e generazione di consenso guidati da riferimenti e de novo",
          "Provenienza SQL specifica per l'esecuzione dalle prove FASTQ ai record molecolari"
        ]
      },
      {
        "heading": "Contenuto",
        "bullets": [
          "Modello di input e pipeline a dieci stadi",
          "Analisi dei marcatori, ritaglio delle letture, deduplicazione e binning SMID",
          "Identificazione del gene sorgente e assemblaggio della molecola",
          "Prodotti di allineamento, consenso e analisi",
          "Livelli di record SQL specifici per l'esecuzione e provenienza molecolare",
          "Distribuzione, reporting client e interfaccia di convalida"
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
        "Analisi del marcatore PSeq",
        "Clustering di lettura basato su SMID",
        "Identificazione del gene sorgente",
        "Trascrizione dell'assemblea e del consenso",
        "Provenienza SQL specifica per l'esecuzione"
      ],
      "searchKeywords": [
        "PSeq",
        "Gasdotti di dati PSeq",
        "FASTQ",
        "Identificatore della molecola di origine",
        "Raggruppamento SMID",
        "assemblaggio guidato da riferimento",
        "assemblea ex novo",
        "Sequenza consenso dell'RNA",
        "provenienza molecolare"
      ]
    }
  },
  {
    "translationKey": "white-paper.initial-validation",
    "kind": "white-paper",
    "title": "Convalida tecnica iniziale della piattaforma di sequenziamento dell'RNA a molecola intera PSeq",
    "metaTitle": "Convalida tecnica iniziale della piattaforma di sequenziamento dell'RNA per molecole intere PSeq | Phaeno",
    "description": "Le prove iniziali di PSeq v1 esaminano la struttura della libreria, il posizionamento dei marcatori, l'assemblaggio della trascrizione raggruppata SMID, la fasatura PRPF31 e la tracciabilità dalla lettura grezza al consenso.",
    "eyebrow": "Phaeno Libro bianco",
    "lead": "Le prove iniziali di PSeq v1 esaminano la struttura della libreria, il posizionamento dei marcatori, l'assemblaggio della trascrizione raggruppata SMID, la fasatura PRPF31 e la tracciabilità dalla lettura grezza al consenso.",
    "sections": [
      {
        "heading": "Astratto",
        "paragraphs": [
          "La piattaforma PSeq inizia con la preparazione di librerie di DNA con un'architettura informativa specializzata.  Il sequenziamento peer-end convenzionale NGS fornisce quindi alla pipeline di dati automatizzata tutte le informazioni necessarie per assemblare ogni singolo RNA. Insieme, questi elementi formano PSeq Clear-Signal Architecture™, una struttura integrata dalla chimica ai dati per il sequenziamento di intere molecole. Questo documento presenta la convalida tecnica iniziale per PSeq v1 lungo l'intera catena operativa. In un caso di studio, i dati assemblati per una singola trascrizione vengono facilmente visualizzati con un visualizzatore di geni open source (IGV) progettato per esaminare sequenze dell'intero genoma e dati RNA-Seq. Esaminando queste informazioni per una singola trascrizione del gene PRPF31 è possibile visualizzare le prestazioni della pipeline a un livello di dettaglio non altrimenti disponibile.  Questo esercizio illustra ulteriormente la tracciabilità di tutte le fasi della catena operativa della piattaforma. Questo white paper costituisce una convalida tecnica iniziale, da non intendersi come una convalida statisticamente completa della piattaforma, una convalida clinica o un'analisi delle prestazioni normative."
        ]
      },
      {
        "heading": "Argomenti chiave",
        "bullets": [
          "Profili delle dimensioni della libreria Bioanalyzer e prove della posizione dei marcatori",
          "Sanger conferma di marcatore, codice a barre e struttura della base di controllo",
          "Struttura rappresentativa del tag-plus-cDNA FASTQ e accoppiamento di lettura dello stesso gene",
          "PRPF31 SMID prove-bin per il confinamento di un singolo gene e la fasatura della giunzione di giunzione",
          "Tracciabilità dalla lettura grezza al consenso e limiti di convalida attuali"
        ]
      },
      {
        "heading": "Contenuto",
        "bullets": [
          "Domande sulla validazione della biblioteca e riepilogo delle prove",
          "Distribuzione delle dimensioni della libreria e posizionamento dei marcatori",
          "Conferma Sanger e composizione lettura FASTQ",
          "Caso di studio a livello di molecola PRPF31",
          "Allineamento degli esoni e copertura delle giunzioni di giunzione end-to-end",
          "Assemblaggio del consenso del fucile e tracciabilità degli errori a livello di base",
          "Interpretazione delle prove attuali e validazione pianificata per la fase successiva"
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
        "Controllo di qualità della libreria PSeq",
        "Posizionamento del marker e conferma Sanger",
        "FASTQ struttura di lettura",
        "Caso di studio a livello di molecola PRPF31",
        "Fasatura della giunzione end-to-end",
        "Tracciabilità del consenso e limiti di validazione"
      ],
      "searchKeywords": [
        "PSeq",
        "Convalida tecnica PSeq",
        "Bioanalyzer",
        "posizionamento del marcatore",
        "Sequenziamento Sanger",
        "FASTQ struttura di lettura",
        "PRPF31",
        "IGV",
        "Trama del sashimi",
        "SMID",
        "accuratezza del consenso"
      ]
    }
  }
]

export const italianWhitePapers = italianInputs.map(defineItalianPage)

const publicationKeys = new Set(italianWhitePapers.map((page) => page.translationKey))
const missingPublications = localizedRoutePairs.filter(
  (pair) => pair.translationKey.startsWith('white-paper.') && !publicationKeys.has(pair.translationKey),
)
if (missingPublications.length > 0) {
  throw new Error(`Italian publication data is missing: ${missingPublications.map((page) => page.translationKey).join(', ')}`)
}
