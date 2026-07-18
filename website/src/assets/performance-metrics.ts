export const metrics = [
  {
    Metric: "Full-length isoform recovery",
    PSeq: "≥ 94 % (known GENCODE v44)",
    ShortRead: "≈ 72 %",
    LongRead: "≥ 88 %",
    Notes: "End-to-end molecule coverage; no assembly gaps."
  },
  {
    Metric: "Sensitivity for rare isoforms (≤ 0.01 % abundance)",
    PSeq: "≥ 87 % detection",
    ShortRead: "< 5 %",
    LongRead: "≈ 45 %",
    Notes: "Unique molecular barcode (4.3 × 10¹²) eliminates PCR duplicates."
  },
  {
    Metric: "Median transcript length resolved",
    PSeq: "3.2 kb (up to 12 kb)",
    ShortRead: "1.1 kb (fragmented)",
    LongRead: "2.8 kb",
    Notes: "No size-selection bias; compatible with standard paired-end kits."
  },
  {
    Metric: "Base-calling accuracy (Phred Q)",
    PSeq: "Q ≥ 35 across read",
    ShortRead: "Q ≥ 30",
    LongRead: "Q ≥ 20",
    Notes: "Illumina chemistry unchanged. Long read is consensus."
  },
  {
    Metric: "Cost per sample (reagents + sequencing)",
    PSeq: "≈ $180 (1 µg RNA, 30 M reads)",
    ShortRead: "≈ $210",
    LongRead: "≈ $650",
    Notes: "Uses existing NGS infrastructure; no proprietary hardware."
  },
  {
    Metric: "Hands-on time",
    PSeq: "< 2 h",
    ShortRead: "≈ 3 h",
    LongRead: "≈ 6 h",
    Notes: "Isothermal tagging + single-tube workflow."
  },
  {
    Metric: "Turn-around time (library → FASTA)",
    PSeq: "< 24 h",
    ShortRead: "≈ 36 h",
    LongRead: "≈ 72 h",
    Notes: "Cloud pipeline; parallelizable."
  },            
]