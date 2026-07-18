---
title: "An introduction to Phased Sequencing: Part 1 (v1)"
summary: "Why RNA Needs Better Measurement"
image: "/images/media/blog/an-introduction-to-phased-sequencing.png"
authors: ["William Agnew"]
date: '2026-04-28'
---
<p align="center"><strong><i>This is part 1 of a 3 part series</i></strong></p>

### Summary

RNA is rapidly emerging as an exciting and productive focus for both diagnostics and therapeutic approaches in genomic medicine. A significant advance in RNA tools promises to be disproportionately impactful.

Phaeno PSeq technology opens the door to aspects of RNA biology that have been largely overlooked, in part because the information has been challenging to access with available methods. Phaeno phased sequencing (**Pseq**) allows whole molecule resolution of individual RNAs on high-throughput, high accuracy, short-read NGS instruments. The articles in this series will explore how this capability can prove useful.

### Introduction
A striking outcome of the Human Genome Project is a growing appreciation that thephenotypic potential of the human genome does not fully arise until after complex steps in RNA processing.

Precursor mRNAs are transcribed from every gene. The cell’s influence begins at determining what region of each gene is to be used, by activating alternative promoter sites to initiate transcription, and alternative chain termination and polyadenylation sequences. Between these boundaries, the RNAs are alternatively spliced, edited and otherwise modified to produce multiple products from each gene. Very often, these different products have different molecular functions.

For protein-coding genes, it is not unusual for a single gene to produce 40 or more protein isoforms, or the same isoforms with different cellular patterns of expression. Each isoform is specifically recombined with untranslated UTR sequences that regulate where, when, and at what levels the proteins will be expressed: RNA trafficking codes, riboswitches, ribozymes, restriction sites for turnover-regulated endonucleases, micro-RNA binding sites, etc. The precision allowed, for instance, in sending the RNA to distant extensions in a cell where the protein can be synthesized, is extraordinary.

In short, every transcript is a quantum of genetic information that can change with cell differentiation, aging, or the progression of disease. Typically, a cell will express products from 8,000 to 10,000 DNA genes, an almost uncountable number of alternative proteomes, which are subject to rapid changes and fluctuations as the cell operates in the local environment of tissues and organs.

This article describes our methods for whole-molecule resolution of protein-coding and functional RNAs. Phaeno **PSeq** resolves entire, end-to-end sequences of each individual RNA molecules, with high accuracy. This can be performed on a scale approaching that of solution chemistry. This technology, PSeq, offers a wide range of opportunities for in depth biomedical inquiry.

### Aside from demonstrating technical virtuosity, why is whole molecule sequencing useful? In understanding biological function and phenotype?
Before commenting on this question, we should clarify what we mean by the terms used to describe whole-molecule phased-sequencing (WMPS).

- **Single molecule sequencing:** Sequencing an individual molecule (e.g. not merely and individual ‘kind’ of molecule) from end to end.
- **Phased sequencing:** As a direct consequence of sequencing a full diversity of many separate, potentially similar molecules in a complex mixture, this represents “phased” sequencing – in which the intramolecular linkages of all sequence elements in every molecule is resolved – e.g., exon junctions, random-mutations, allele-denoting SNPs, gene-fusion boundaries, etc.
- **Shotgun sequencing:** a sequencing strategy, of which modern NGS is the most advanced embodiment – in which individual molecules are replicated, sheared into small random fragments, are sequenced on a massively parallel scale, after which the unique consensus sequence of the source molecule is reconstructed by tiling overlapping fragments.
**\[figure\]**
- **Accuracy:** Error frequency and accuracy can be thought of as reciprocal functions. For example where the former represents the number of errors per base called, the latter (accuracy)represents the number of bases that have to be read before encountering the first error. When the accuracy significantly exceeds the average size of the target molecule population, true single-molecule sequencing can be performed.

Accuracy includes the ***intrinsic*** accuracy with which the platform calls each base and the ***consensus*** accuracy when each base in a target molecule is repeatedly sequenced.

In sequencing genomic DNA, fragments of multiple chromosomes from different cells are sequenced, and indeterminant results can result when, in particular locations, differentiation or disease (e.g. cancer) produces heterogeneity.

In PSeq phased sequencing of single RNA molecules, consensus accuracy can maximized as the exponential expansion of the intrinsic accuracy. If 1000 bases can be sequenced before encountering the first error (Q30), the likelihood of encountering the same error twice is approximately 1 in 9 million at 2X,

By sequencing at 5x depth of coverage, target of RNAs of any sizes likely to be encountered in nature can be sequenced many times before encountering **a platform error.** This platform accuracy exceeds, at present, the accuracy with which target molecules can be reverse transcribed. This accuracy distinguishes PSeq from RNA-Seq and all Third-Generation platforms, and the sequencing of genomic DNA.

- **A further note on phasing:** In genetics, haplotype-phasing describes the segregation of alleles, SNPs, rearrangements and other mutations, between maternal and paternal chromosomes. At the genomic level, accurate phasing can be an involved process: moreover, because single molecules are not analyzed (in the sense used in this article) developmental variations, or alternations during disease progression, can cast doubt on. Some of these details. Similar ambiguities are not expected to arise for WMPS of transcripts.

### Why does whole-molecule sequencing have special bearing on explaining biological functions and phenotypes?
- **Phenotypes are observables:**
The term “phenotype” is almost unmanageably broad – defined as any observable aspect of biological form, behavior or function. A phenotype might be as discrete eye color, or as general as a vague as a life-time health record. Despite this –
- **Biological phenotypes have a molecular concomitant.**
- Cells of a wide variety of types develop in associations to form tissues, organs and organ systems: (nominally 100 trillion cells live together in the adult human body).
- Virtually all aspects of cellular form and function are under the control of specific proteins – and perhaps to a lesser extent, functional RNAs (fRNAs).
- Transcriptomes encode the isoforms of proteins and fRNAs, as well as the details about where, when and how abundantly they are expressed.

**It follows that the transcriptome of a cell or of the cells of a tissue, organ or organ system is a form of ‘molecular phenotype.’**

Understanding how the molecular phenotype translates into the extraordinary details of reactive, living tissues will be a generational challenge. However, It seems certain, given the potential for machine learning to discover and exploit “languages,” AI will prove useful in exploring the relationship between information in the molecular phenotype and phenotypic manifestations more generally.

### How does PSeq compare with other RNA technology
Among other commercial platforms, PSeq most closely resembles RNA-Seq. While both methods employ short-read sequencing, they are fundamentally different

Although the sequencing of short-reads is highly accurate, RNA-Seq relies on any of a variety of packages of statistical algorithms to reconstruct a weighted likelihoods of particular full-length RNAs that may be in a sample. At the outset, RNA-Seq destroys information which it then tries to recover statistically.

In many cases RNA-Seq is fundamentally incapable of choosing between possible transcriptomes even for a single gene,[^1] let alone among products of thousands of genes.

In respect to the composition of single molecules, the actual presence of Individual RNAs cannot be accepted without independent validation. This uncertainty prevents optimal use of machine learning to elucidate fundamental biology or, discovery of the molecular causes of disease, or targeted drug or immune therapies

Despite these significant limitations, RNA-Seq has been a foundational technology of the pipeline for gene annotation cataloging the identity of splice variants for human genes in the **NCBI RefSeq** database.[^2] It is also often the tool of choice for single cell RNA-Seq (scRNA-Seq).[^3]

PSeq promises to greatly accelerate and reduce the costs for programs like the NCBI annotation pipeline.

**Third generation** long-read technology, such as that of Oxford Nanotechnology (ONT) or PacBio chip-based sequencing effectively perform a form of distributed cloning, in which molecules are physically separated for sequencing. Elsewhere we will discuss the limitations of these approaches that constrain their use and cost efficiency.

### PSeq vs RNA Seq
While both methods run on unmodified NGS instruments, PSeq differs qualitatively from RNA-Seq.

PSeq preserves the identity of each RNA source molecule throughout sample processing.

The automated pipeline for assembling RNAs does not rely on statistical guesswork. Assembly is based on comparing information in fragments all from the same source molecule.

Another important benefit of the computational strategy is that the pipeline records details on how each starting molecule proceeds through the steps in library preparation. It also renders the raw data files exiting the sequencer, each of the steps from identifying the source and sense of the source gene, assembly of the full-length transcripts and compilation of molecules comprising the sample. The enormous depth of this information allows for validation the output, down to the most elemental level. This is essential for validating the reliability of conclusions as the scale of analysis increases.

### How does PSeq accomplish whole-molecule resolution?
PSeq chemistry attaches a multifunctional tagging reagent to each reverse transcript, followed by preparation of short-fragment DNA sequencing libraries. In PSeq libraries, source-molecule information is retained on each random read-fragment. Library protocols are performed in free solution, employing reactions confined to intramolecular rearrangements.

After conventional sequencing, the ***data*** for the target molecules effectively “cloned” (binned into computer files) for each molecule. Trimmed reads are used for gene identification and transcript assembly for whole-molecule resolution.

Because every base is independently sequenced with a user-selected depth of coverage, PSeq can achieve **accuracy** exceeding the gold-standard of Sanger Sequencing, but at scale.

### PSeq returns more information than RNA-Seq
This can be illustrated in three successive examples.

1. Analyzing 1 million *identical* RNA molecules,
- RNA-Seq will yield the accurate consensus sequence and, with ‘indexing,’ report 1 million copies.
- PSeq returns 1 million individual sequences, in this case, all identical.
2. Changing the task slightly: analyzing 1 million randomly mutated RNA virus genomes:
- RNA-Seq would yield no actual virus genome, but will yield statistics regarding the incidence of individual, unlinked mutations.
- PSeq will again return 1 million sequences, with the linked ensemble of random mutations of each: whole virus genomes.
3. Sequencing isoforms of protein-coding messenger RNAs or fRNAs:
- RNA-Seq estimates the likelihood of constructs from each gene, but identifying actual isoforms requires extensive, independent confirmation.
- PSeq whole-molecular resolution bundles each protein isoform with the associated UTR promoters, trafficking codes, riboswitches, ribozymes, sites for interaction with micro-RNAs or turn-over regulating endonucleases, etc. If even further confirmation is essential, copies of any individual molecule can be cloned, from retained starting material,
- with kits designed for use with the barcodes, to biobank the cDNA, produce RNA or crystallography-grade protein.

### PSeq vs RNA-Seq data processing:
By the time **RNA-Seq** data reach downstream pipelines, transcripts have already been fragmented and aggregated. Structures have been inferred and averaged — often into gene-level counts that obscure the very regulatory structure that is generally overlooked: promoter choices, protein coding ORF alternative splicing, and RNA editing and UTR variations that specify isoform-specific trafficking and expression are treated as secondary features, reconstructed statistically if at all. Each full-length transcript is an integrated quantum of genetic information.

In contrast, **PSeq** proprietary chemistry preserves molecular identification of each individual target molecule, from initial tagging with one of up to 4.3 trillion barcodes, through DNA library preparation, sequencing and final data assembly by the automated data pipeline.

Resolution of full-length isoform-specific RNAs – with the associated regulatory features— renders PSeq convenient for the discovery and validation of new isoforms.

<figure class="pseq-folding-figure">
  <div class="pseq-folding-images">
    <img src="/images/media/blog/image10.png" alt="Predicted folding of whole molecule RNA" loading="lazy" />
    <img src="/images/media/blog/image20.png" alt="Predicted protein folding" loading="lazy" />
  </div>
  <figcaption>
    Predicted folding of whole molecule RNA (left) and predicted protein-folding (right) for a single Pre-mRNA Processing Factor 31 (PRPF31) mRNA molecule sequenced by <strong>PSec</strong> from human RNA.
  </figcaption>
</figure>

<style>
  .pseq-folding-figure {
    margin: 1.75rem 0 1.5rem;
  }

  .pseq-folding-images {
    align-items: end;
    display: grid;
    gap: 2rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    justify-items: center;
    max-width: 38rem;
  }

  .pseq-folding-images img {
    height: auto;
    max-width: 100%;
    width: 14.5rem;
  }

  .pseq-folding-figure figcaption {
    color: #111827;
    font-size: 0.85rem;
    font-style: italic;
    line-height: 1.45;
    margin-top: 1rem;
    max-width: 58rem;
  }

  @media (max-width: 520px) {
    .pseq-folding-images {
      gap: 1.25rem;
      grid-template-columns: 1fr;
      justify-items: start;
    }
  }
</style>

As we will describe in future articles, the information in each transcript is written in multiple languages, only one of which is the open-reading frame for a protein variant.

### Producing first class data for machine learning. TRANSITION HEFE
The figures shown above illustrate just part of the unambiguous data available for one individual molecule sequenced, with PSeq.

Messenger RNAs are predicted to fold into a mostly double-stranded secondary structures. *Within* the RNA, a stretch of the nucleotide bases encompasses the open reading frame encoding the polypeptide at right. The polypeptide, in turn, encodes the shape of the protein. This sequence also embodies a highly specialized kinetic pathway for folding the protein into its final, active configuration, perhaps under the influence of yet another protein, called a chaperone.

This example, PRPF31 encodes a crucial protein constituent of the cellular molecular complex that splices mRNAs … ironically including this mRNA that encodes this particular splice variant of this particular protein. Three hundred such proteins help form this complex, the spliceosome, all subject to alternative splicing isoforms. This poses some fascinating puzzles ahead.

### Why is PSeq better than RNA-Seq and 3<sup>rd</sup> Generation long sequencing for Machine Learning
We might think of the activity of each of the genes at work in a cell as a conversation. The number of transcripts – or ‘gene count’ – is comparable to how loud the gene is talking. In this comparison, the structure of each transcript is akin to the sentences of the conversation … the content of the message.

RNA-Seq readily captures ***gene-counts*** –the relative activity of each gene contributing to phenotype, but the “words” are garbled. The ***structure*** of each transcript, best captured with PSeq, is the actual message each active gene is contributing to the genetic conversation; in this case, gene counts are also resolved. Extending this metaphor, **3<sup>rd</sup> Generation** long sequencing can capture many of the words of the conversation … great for building a dictionary, but a tendency to miss rare variants.

Each molecule is thus a bundled quantum of information that machine learning has at its disposal for analysis. Gene counts indicate that genes are talking; the structure of the RNAs indicate what is being said.

### Why this matters for machine learning
Gene-level features captured in RNA-Seq data can conflate multiple biological states. When discrete transcripts with different functional consequences are collapsed into one value, the model is forced to learn across mixed signals.

This matters because inference-heavy inputs propagate uncertainty into the model. Many transcript-level estimates are reconstructed statistically rather than directly observed. This uncertainty can rarely be encoded explicitly and nevertheless denies ML robust learning opportunities.

Information is, formally, the reduction of uncertainty in a message. With propagation of RNA-Seq data, uncertainty progressively increases. In short, not using first class data – e.g. whole-molecule resolved structures – progressively undermines the effectiveness of machine learning as the scale of data expands.

Last, feature instability undermines generalization. Gene-level summaries often vary with different ground-truth assumptions (prior information), alignment strategies or reference updates. For ML systems intended to generalize across datasets, timepoint or cohorts, this instability can produce hard-to-control variance – a picture that progressively loses focus.

### How RNA-Seq and PSeq differ.
### Conclusion:
Most kinds of molecules do not merit being analyzed individually. Informational macromolecules, such as DNA, RNA and proteins, present exceptions. Because of its scale, accuracy, high throughput -- its intrinsic design, Next Generation sequencing provides a powerful tool with which to analyze the bundles of information created in the cell, encoding proteins and functional RNAs.

Perhaps only a chemistry allowing molecule by molecule analysis, at scale, can match the complexity of diseases like advanced cancer. PSeq has been designed to exploit these exact advantages.

### Looking Ahead to Future Discussions!
In 2026, perhaps somewhat unexpectedly – and 20 years late --- we can fairly state that precision medicine has been launched in an era of ‘unsettled science.’ What is, in fact, the definition of a gene? And the eponymous field of ‘genomics.’

The classical model of the molecular gene elegantly captured our intuitive notions of genes. The **inherited gene** that is passed between generations (double stranded DNA), the **functional gene** that is the source of expressed characteristics (the open reading frame for a protein), and in combination, these constitute the **evolutionary gene**, the substrate for mutation and natural selection. An important overlay to formulation is the well conserved genetic code as the singular language of the Mendelian inheritance.

We now comprehend that the simplicity of the cistronic, one-gene: one-protein gene of microbial species has expanded during the long course of evolution, to produce a vastly more sophisticated informational framework. Almost none of these classical intuitions have been confirmed. The inherited, functional and evolutionary genes are not one and the same, few diseased traits follow simple Mendelian principles, and the genetic code is only one of many languages used by inheritance.

For genomic medicine and fundamental biological research to advance, our technology will have to advance. In subsequent entries, we will discuss the concepts that now leading clinical and basic scientists, to expand and adapt our technology to be more effective.

[^1]: Reagan et al 2020; Reagan: Emerick:

[^2]:

[^3]:
