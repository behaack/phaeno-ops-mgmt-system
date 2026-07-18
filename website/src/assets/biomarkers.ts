export const biomarkers = [
  {
    "Biomarker": "EGFR",
    "GeneTest": "Mutation panel (e.g., exon 19 del)",
    "ProteinTest": "IHC (total protein)",
    "Discordance": "Some mutations may alter protein stability or epitope"
  },
  {
    "Biomarker": "PD-L1",
    "GeneTest": "mRNA expression panels",
    "ProteinTest": "IHC (protein on membrane)",
    "Discordance": "PD-L1 mRNA ≠ surface protein; localization and glycosylation affect detectability"
  },
  {
    "Biomarker": "ER/PR",
    "GeneTest": "ESR1/PGR mRNA expression",
    "ProteinTest": "IHC (nuclear receptor proteins)",
    "Discordance": "Receptor variants may be inactive or degraded"
  },
  {
    "Biomarker": "ALK, ROS1, NTRK",
    "GeneTest": "Fusion detected by NGS or FISH",
    "ProteinTest": "IHC (antibody to fusion protein)",
    "Discordance": "Some fusions may not produce stable or detectable protein"
  },
  {
    "Biomarker": "TP53",
    "GeneTest": "Mutation (missense, nonsense)",
    "ProteinTest": "IHC (accumulation of dysfunctional protein)",
    "Discordance": "Truncating mutations → no protein, despite mutation detected"
  },
  {
    "Biomarker": "CD20",
    "GeneTest": "No DNA test (expression only)",
    "ProteinTest": "IHC / Flow",
    "Discordance": "Splice variants may reduce expression, affecting rituximab efficacy"
  }
]