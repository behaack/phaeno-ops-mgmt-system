// Local illustration transport for actual R&D components. No network writes or persisted records.
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { api } from '../../src/api/client'
import { newBlock, type Project, type Experiment, type Entry, type ResearchBlock } from '../../src/features/research/research-api'

export function installResearchGuideData(options: { prepared?: boolean; completed?: boolean } = {}) {
  const stamp = '2026-10-17T16:00:00Z'
  const project: Project = { id: '11111111-1111-4111-8111-111111111111', name: 'DEMO — buffer exploration', description: 'Fictional example for learning the R&D notebook.', version: 1, updatedAt: stamp }
  const experiment: Experiment = { id: '22222222-2222-4222-8222-222222222222', researchProjectId: project.id, title: 'DEMO — compare buffer A and B', experimentDate: '2026-10-17', status: 'Active', version: 1, lastActivityAtUtc: stamp }
  const initialBlocks = () => ['Purpose', 'Method', 'Observations', 'Results', 'Conclusions'].map(label => newBlock('text', label.toLowerCase(), label))
  const entry = (experimentId: string, title = 'Experiment notebook', entryDate = '2026-10-17', blocks = initialBlocks()): Entry => ({ id: crypto.randomUUID(), researchExperimentId: experimentId, title, entryDate, blocks, createdByUserId: 'demo-researcher', updatedByUserId: 'demo-researcher', createdAt: stamp, updatedAt: stamp, version: 1 })
  const projects = [project]; const experiments = [experiment]; const entries = [entry(experiment.id)]
  entries[0].id = '33333333-3333-4333-8333-333333333333'
  if (options.prepared) {
    entries[0].title = 'DEMO — buffer comparison observations'
    entries[0].blocks = [
      { ...newBlock('text', 'purpose', 'Purpose'), text: 'Compare fictional buffers A and B under the same demonstration conditions.' },
      { ...newBlock('text', 'method', 'Method'), text: 'Prepare matched aliquots. Record buffer identity, concentration and handling conditions.' },
      { ...newBlock('text', 'observations', 'Observations'), text: 'Fictional training observations only; no scientific conclusions are established.' },
      { ...newBlock('table', 'results', 'Results'), columns: ['Buffer', 'Concentration (ng/µL)', 'RIN'], rows: [['A', '18.4', '8.1'], ['B', '17.9', '8.0']] },
    ]
  }
  if (options.completed) experiment.status = 'Completed'
  const revisions: { id: string; kind: string; recordId: string; revision: number; action: string; snapshotJson: string; recordedByUserId: string; authorName: string; recordedAtUtc: string }[] = []
  const authors = [{ id: 'demo-researcher', name: 'Demo Researcher' }]
  const record = (kind: string, value: Project | Experiment | Entry, action: string) => revisions.unshift({ id: crypto.randomUUID(), kind, recordId: value.id, revision: value.version, action, snapshotJson: JSON.stringify(value), recordedByUserId: 'demo-researcher', authorName: 'Demo Researcher', recordedAtUtc: stamp })
  record('project', project, 'Created'); record('experiment', experiment, 'Created'); record('entry', entries[0], 'Created')
  const meta = (value: Experiment) => ({ project: projects.find(p => p.id === value.researchProjectId), experiment: value, entryCount: entries.filter(e => e.researchExperimentId === value.id).length })
  const page = <T,>(values: T[], number: number) => ({ items: values.slice((number - 1) * 25, number * 25), totalCount: values.length, page: number, pageSize: 25 })
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const path = (config.url ?? '').replace(/^\/research\//, '').split('?')[0]
    const method = config.method?.toLowerCase() ?? 'get'
    const input = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    const parts = path.split('/'); const number = Number(config.params?.page ?? 1)
    let data: unknown
    if (path === 'projects/choices') data = projects.map(p => ({ id: p.id, name: p.name }))
    else if (path === 'projects' && method === 'get') data = page(projects.filter(p => !config.params?.search || p.name.toLowerCase().includes(String(config.params.search).toLowerCase())).map(p => ({ ...p, experimentCount: experiments.filter(e => e.researchProjectId === p.id).length })), number)
    else if (path === 'projects' && method === 'post') { const value = { ...project, ...input, id: crypto.randomUUID(), version: 1 }; projects.push(value); record('project', value, 'Created'); data = value }
    else if (parts[0] === 'projects') { const value = projects.find(p => p.id === parts[1])!; if (method === 'put') { Object.assign(value, input, { version: value.version + 1 }); record('project', value, 'Updated') } data = value }
    else if (path === 'experiments' && method === 'get') data = page(experiments.filter(e => (!config.params?.projectId || e.researchProjectId === config.params.projectId) && (!config.params?.status || e.status === config.params.status) && (!config.params?.search || JSON.stringify([e, entries.filter(n => n.researchExperimentId === e.id)]).toLowerCase().includes(String(config.params.search).toLowerCase()))).map(e => ({ ...e, projectName: projects.find(p => p.id === e.researchProjectId)?.name })), number)
    else if (path === 'experiments' && method === 'post') { const value: Experiment = { ...experiment, id: crypto.randomUUID(), researchProjectId: input.projectId, title: input.title, experimentDate: input.experimentDate, version: 1 }; experiments.push(value); const first = entry(value.id, 'Experiment notebook', input.experimentDate || input.initialEntryDate); entries.push(first); record('experiment', value, 'Created'); record('entry', first, 'Created'); data = meta(value) }
    else if (parts[0] === 'experiments') {
      const value = experiments.find(e => e.id === parts[1])!
      if (parts[2] === 'transition') { value.status = input.action === 'complete' ? 'Completed' : 'Active'; value.version++; record('experiment', value, value.status === 'Completed' ? 'Completed' : 'Reopened'); data = meta(value) }
      else if (parts[2] === 'copy') {
        const copy: Experiment = { ...value, id: crypto.randomUUID(), title: input.title, researchProjectId: input.projectId, experimentDate: input.experimentDate, status: 'Active', version: 1 }; experiments.push(copy)
        for (const original of entries.filter(e => e.researchExperimentId === value.id)) { const blocks: ResearchBlock[] = original.blocks.filter(b => b.kind !== 'file').map(b => ({ ...structuredClone(b), id: crypto.randomUUID(), text: b.kind === 'text' ? ['purpose', 'method'].includes(b.section) ? b.text : '' : null, rows: b.kind === 'table' ? [] : null })); const repeated = entry(copy.id, original.title, input.experimentDate || input.initialEntryDate, blocks); entries.push(repeated); record('entry', repeated, 'Created') }
        record('experiment', copy, 'Setup copied'); data = meta(copy)
      } else if (parts[2] === 'entries') {
        if (parts[4] === 'attachments') data = []
        else if (parts[3]) { const notebook = entries.find(e => e.id === parts[3])!; if (method === 'put') { if (input.experimentVersion !== value.version || input.version !== notebook.version) throw new AxiosError('The demonstration notebook changed.', 'ERR_BAD_REQUEST', config, undefined, { config, data: { success: false, error: { message: 'Review the latest saved content before saving again.' } }, status: 409, statusText: 'Conflict', headers: {} }); Object.assign(notebook, { title: input.title, entryDate: input.entryDate, blocks: input.blocks, version: notebook.version + 1 }); value.version++; record('entry', notebook, 'Updated'); record('experiment', value, 'Entry updated') } data = { experiment: value, entry: notebook, authors } }
        else if (method === 'post') { const notebook = entry(value.id, input.title, input.entryDate, []); entries.push(notebook); value.version++; record('entry', notebook, 'Created'); record('experiment', value, 'Entry added'); data = { experiment: value, entry: notebook, authors } }
        else data = page(entries.filter(e => e.researchExperimentId === value.id).map(e => ({ id: e.id, researchExperimentId: e.researchExperimentId, title: e.title, entryDate: e.entryDate, createdAt: e.createdAt, updatedAt: e.updatedAt, version: e.version, createdByName: 'Demo Researcher', updatedByName: 'Demo Researcher' })), number)
      } else { if (method === 'put') { Object.assign(value, { title: input.title, experimentDate: input.experimentDate, version: value.version + 1 }); record('experiment', value, 'Updated') } data = meta(value) }
    } else if (path === 'attachments/options') data = { maximumBytes: 104857600 }
    else if (parts[0] === 'history') { const matches = revisions.filter(r => r.kind === parts[1] && r.recordId === parts[2]); data = parts[3] ? { snapshotJson: matches.find(r => r.id === parts[3])!.snapshotJson } : page(matches, number) }
    else data = { items: [], totalCount: 0 }
    return { config, status: 200, statusText: 'OK', headers: {}, data: { success: true, data: structuredClone(data) } }
  }
}
