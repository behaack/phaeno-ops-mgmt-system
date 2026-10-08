# Fake PSeq library preparation — October 4, 2026

## Result and evidence boundary

**Pass (simulated), local connected Chrome UI.** The owner-confirmed fake job
**6WTMNUFE** completed library preparation on its saved six-position tray.
The refreshed page shows **Complete**, all six positions **Succeeded**, and
**6 passing libraries · 0 assigned**, each **Ready for sequencing**.
No sequencing batch or Customer result release was created. All scans, bench
values, QC outcomes and discard reasons are explicitly simulated; this is not
physical printer/scanner, laboratory, scientific or production acceptance.

## Retained configuration and lineage

- Saved tray: `f98d854e-8575-4923-b783-14b83540e4f1`, physical identifier
  `DEMO-PSEQ-TRAY-20261003`, format **DEMO PSeq 2 × 3**.
- Existing approved **DEMO PSeq library workflow** and **DEMO PSeq library
  preparation** protocol were reused. The three pinned Lab steps are specimen
  transfer, master-mix addition, and library yield/QC. No new tray, step,
  protocol or workflow revision was needed for this continuation.
- Original accessioned source tubes, authorization amendment and earlier
  receipt/accession history remain retained. The four sources outside this
  tray and the unreceived second phase were not processed.

| Position | Source tube | Library tube | Source balance after 0.010 mL transfer |
| --- | --- | --- | --- |
| A1 | 9595-01-01 | PH-L-Q6EDBVRZJE-3 | 1.49 mL |
| A2 | 9595-01-02 | PH-L-XMB5AJ3D8U-B | 1.49 mL |
| A3 | 9595-01-03 | PH-L-YQ9PB2X3H5-F | 1.49 mL |
| B1 | 9595-01-04 | PH-L-24CCNF8NPB-Q | 1.99 mL |
| B2 | 9595-01-05 | PH-L-TNNZSBY2X9-T | 1.49 mL |
| B3 | 9595-01-06 | PH-L-GQLWQVTLCZ-X | 1.49 mL |

Each library's initial simulated label outcome and matching barcode were saved
through the print dialog. Chrome native print previews required owner dismissal.
Earlier Failed print history was preserved. The biological step then saved all
six matching source/destination identities and actual amounts atomically.
No source-exhaustion override was selected.

## Fresh master mix and disposal

The earlier preparation `e4025d9a-162b-4d4d-b82a-c0c3eaa79ba0` had passed its
end-of-day cutoff. The UI showed the expiry block; its unused calculated 100 µL
was explicitly discarded with a simulated reason. It was not backdated or used.

A fresh preparation `09a16378-69b7-4e9a-9016-bbc5baa10d94`, barcode
`PH-MX-09A1637869B74E9A9016BBC5BAA10D94`, reused approved **DEMO Master Mix —
100 µL** revision 1. Numbered lot uses were **80 µL DEMO-BUF-20261003** and
**20 µL DEMO-ENZ-20261003**. Both procedure steps were recorded with simulated
notes, a fictional 30-second mixing duration and Pass QC. Completing 100 µL
made the preparation Ready for the current local work day.

The tray step recorded the matching mix barcode and **10 µL per sample**,
deducting **60 µL total** and retaining the reagent-lot → mix → tray linkage.
After library completion, the preparation was marked **Discarded**, with the
calculated unused **40 µL** and explicit simulated disposal reason. The measured
discard field remained empty because no physical measurement occurred.

## Completion checks

The final Lab step recorded fictional **20 µL output** and **5 ng/µL
concentration** for every library, its exact tray position, and simulated Pass
QC. All six output identities were separately confirmed by matching barcode.
The protocol completed only after these entries; the batch then completed
after confirmation of every tube's outcome. Its retained history has 27 entries.
The final page was refreshed and visibly showed all six successes and the
sequencing handoff. Screenshots of the completed tray and discarded mix were
saved in the task's visualization output.

No application implementation changed during this continuation. No automated
suite was rerun, and no Git mutation, deployment, migration or direct database
write was performed. The preceding label correction's two focused component
regressions, typing/lint and single-page owner-exported PDF checks remain
separately recorded in the Lab Operations and E2E plans.
