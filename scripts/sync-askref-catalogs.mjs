import fs from 'node:fs/promises'
import { createServer } from 'vite'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { commonQuestionScenarios } = await server.ssrLoadModule('/src/lib/askref-common-questions.ts')
  const { trainingGuideScenarios } = await server.ssrLoadModule('/src/lib/askref-training.ts')
  const { expandedTrainingScenarios } = await server.ssrLoadModule('/src/lib/askref-expanded-training.ts')
  const entries = [...commonQuestionScenarios, ...trainingGuideScenarios, ...expandedTrainingScenarios]
  const ids = new Set(entries.map((entry) => entry.id))
  const path = 'src/lib/askref-extra-scenarios.json'
  const existing = JSON.parse(await fs.readFile(path, 'utf8'))
  await fs.writeFile(path, JSON.stringify([...existing.filter((entry) => !ids.has(entry.id)), ...entries], null, 2) + '\n')
  console.log(`Synchronized ${entries.length} catalog drafts; approvals unchanged.`)
} finally { await server.close() }
