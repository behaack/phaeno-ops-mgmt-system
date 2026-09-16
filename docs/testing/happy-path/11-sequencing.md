# HP-11 — Sequence libraries and record custody

**Person:** Laboratory operator handling sequencing/provider coordination.

**Ready before starting:** Eligible libraries from the completed HP-10 preparation batch, approved provider instructions and the corresponding recorded or scheduled physical events.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open Sequencing batches and create a draft with a recognizable run-prefixed name. | A draft batch with its immutable batch number appears. |
| 2 | Select it under Scan libraries into a batch and scan each prepared library container. | Membership contains the exact QC-passed libraries and their barcodes. |
| 3 | Review membership and choose Start. Confirm the observed start time. | The batch is In progress with its saved start time. |
| 4 | Create the outsourced sendout with provider, reference, expected completion and approved manifest notes. | The sendout freezes the batch's library membership. |
| 5 | At physical dispatch, record Shipped and the custody/carrier details. | The shipment event and responsible party are retained. |
| 6 | Record Received by provider, then Sequencing as those events are confirmed. | Provider progress and custody follow the actual sequence. |
| 7 | When provider work finishes, record Complete on the sendout, then Complete batch with the observed completion time. | Sendout and batch are complete with the same library lineage. |
| 8 | Review the original Job's current progress and sample context. | The laboratory history remains connected to the original submitted samples. |

**Done:** Record sequencing batch, sendout and provider references. The upstream scientific owner now prepares and registers each final package for [HP-12](12-results-and-job-completion.md). That processing is an external handoff; POMS tracks custody and review rather than running the upstream analysis pipeline.

[Results](RESULTS.md) · [Index](README.md) · [Workflow guide](../../../frontend/src/content/docs/phaeno/lab-libraries-batches-sequencing.mdx)
