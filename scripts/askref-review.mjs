import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'

// Repository review tooling, not a browser permission or an official endorsement.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const bank = await server.ssrLoadModule('/src/lib/askref-bank.ts')
  const rules = await server.ssrLoadModule('/src/lib/pdsa-rules.ts')
  const [command, id, ...args] = process.argv.slice(2)
  if (command === 'export') {
    const output = id || 'docs/askref-review-pack.json'
    await writeFile(output, JSON.stringify({
      notice: 'Editorial drafts. Review the original PDSA rulebook and adopted IFAB edition before approval.',
      versions: { PDSA: rules.PDSA_RULEBOOK_VERSION, IFAB: rules.IFAB_RULES_VERSION },
      scenarios: bank.ruleScenarios.map((entry) => ({ ...entry,
        approved: bank.isApprovedScenario(entry),
        evidence: bank.bankSources.filter((source) => entry.sourceIds.includes(source.id)),
      })),
    }, null, 2) + '\n')
    const markdownPath = output.replace(/\.json$/i, '') + '.md'
    const markdown = [
      '# AskRef volunteer referee scenario review pack',
      '',
      `${bank.ruleScenarios.length} scenarios; ${bank.ruleScenarios.reduce((total, entry) => total + entry.questions.length, 0)} question phrasings.`,
      '',
      `Sources: PDSA ${rules.PDSA_RULEBOOK_VERSION}; adopted IFAB fallback edition ${rules.IFAB_RULES_VERSION}.`,
      '',
      'These are editorial practice drafts linked to the bundled rule summaries. They have not been approved by PDSA or its Referee Coordinator. Review against the original adopted documents before match use. Suggested wording is communication advice, not an additional rule.',
      '',
      ...bank.ruleScenarios.flatMap((entry, index) => [
        `## ${index + 1}. ${entry.questions[0]}`, '',
        `${entry.audience} · ${entry.divisions.join('/')} · ${entry.topic} · ID: ${entry.id}`, '',
        `Status: ${bank.isApprovedScenario(entry) ? 'Approved; source snapshots current' : 'Draft — coordinator review pending'}`, '',
        ...entry.questions.slice(1).map((question) => `- Also asked as: “${question}”`), '',
        entry.answer, '', `**You can say:** “${entry.sayToThem}”`, '',
        ...(entry.ruleApplication ? [`**Restart:** ${entry.ruleApplication.restartType}`, '', `**Location:** ${entry.ruleApplication.location}`, '', `**Discipline:** ${entry.ruleApplication.discipline}`, ''] : []),
        ...(entry.needsCoordinator ? ['**Help needed:** Confirm missing facts, full procedure or coordinator direction as described above.', ''] : []),
        `**Supporting sources:** ${bank.bankSources.filter((source) => entry.sourceIds.includes(source.id)).map((source) => source.label).join('; ')}`, '',
      ]),
    ].join('\n')
    await writeFile(markdownPath, markdown + '\n')
    console.log(`Exported ${bank.ruleScenarios.length} scenarios to ${output} and ${markdownPath}`)
  } else if (command === 'approve') {
    const option = (name) => args[args.indexOf(name) + 1]
    const reviewer = args.includes('--reviewer') ? option('--reviewer') : ''
    const date = args.includes('--date') ? option('--date') : ''
    if (!reviewer?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !args.includes('--checked-originals')) {
      throw new Error('Approval requires --reviewer "Name" --date YYYY-MM-DD --checked-originals. Only the reviewer who checked the original documents should run this.')
    }
    const entry = bank.ruleScenarios.find((item) => item.id === id)
    if (!entry) throw new Error(`Unknown scenario: ${id}`)
    const reviewsPath = 'src/lib/askref-approvals.json'
    const reviews = JSON.parse(await readFile(reviewsPath, 'utf8'))
    reviews[id] = {
      reviewedBy: reviewer, reviewedOn: date, scenarioSnapshot: bank.scenarioSnapshot(entry),
      sourceSnapshots: entry.sourceIds.map((sourceId) => {
        const source = bank.bankSources.find((item) => item.id === sourceId)
        if (!source) throw new Error(`Missing versioned source: ${sourceId}`)
        return { id: source.id, text: source.text, edition: source.edition }
      }),
    }
    await writeFile(reviewsPath, JSON.stringify(reviews, null, 2) + '\n')
    console.log(`Recorded ${reviewer}'s review for ${id}; inspect and commit the diff before deployment.`)
  } else if (command === 'import') {
    const packet = JSON.parse(await readFile(id, 'utf8'))
    const entry = packet.scenario
    const sources = packet.sources ?? []
    const requiredText = ['id', 'topic', 'answer', 'sayToThem']
    if (!entry || requiredText.some((key) => typeof entry[key] !== 'string' || !entry[key].trim())
      || !/^[a-z0-9-]+$/.test(entry.id) || bank.ruleScenarios.some((item) => item.id === entry.id)
      || !['Coach', 'Player', 'Parent'].includes(entry.audience)
      || !Array.isArray(entry.divisions) || !entry.divisions.length || entry.divisions.some((value) => !bank.refereeDivisions.includes(value))
      || !Array.isArray(entry.questions) || entry.questions.length < 2 || entry.questions.some((value) => typeof value !== 'string' || value.trim().length < 3 || value.length > 500)
      || !Array.isArray(entry.sourceIds) || !entry.sourceIds.length) throw new Error('Supply a curated {scenario, sources} packet with a unique id, Coach/Player/Parent audience, divisions, at least two question variants, answer, sayToThem and sourceIds.')
    for (const source of sources) {
      if (source.authority !== 'IFAB' || source.version !== rules.IFAB_RULES_VERSION || source.edition !== rules.IFAB_RULES_VERSION
        || !/^IFAB-2025-26-LAW-\d+$/.test(source.id) || !/^https:\/\/www\.theifab\.com\/laws\/2025-26\/[^/]+\/?$/.test(source.url ?? '')
        || typeof source.text !== 'string' || source.text.trim().length < 15 || typeof source.label !== 'string') throw new Error('Additional evidence must be versioned official IFAB text.')
    }
    const known = [...bank.bankSources, ...sources]
    if (entry.sourceIds.some((sourceId) => !known.some((source) => source.id === sourceId))) throw new Error('Every sourceId must have bundled PDSA or supplied IFAB evidence.')
    const extrasPath = 'src/lib/askref-extra-scenarios.json'
    const sourcesPath = 'src/lib/askref-ifab-sources.json'
    const extras = JSON.parse(await readFile(extrasPath, 'utf8'))
    const existingSources = JSON.parse(await readFile(sourcesPath, 'utf8'))
    for (const source of sources) {
      const existing = existingSources.find((item) => item.id === source.id)
      if (existing && JSON.stringify(existing) !== JSON.stringify(source)) throw new Error('Source ID already exists with different text. Review source changes explicitly in the repository.')
    }
    await writeFile(sourcesPath, JSON.stringify([...existingSources, ...sources.filter((source) => !existingSources.some((item) => item.id === source.id))], null, 2) + '\n')
    await writeFile(extrasPath, JSON.stringify([...extras, entry], null, 2) + '\n')
    console.log(`Imported ${entry.id} as a draft. Review the original documents, then use approve separately.`)
  } else {
    throw new Error('Use: npm run askref:review -- export [output.json] OR import <curated-packet.json> OR approve <scenario-id> --reviewer "Name" --date YYYY-MM-DD --checked-originals')
  }
} finally {
  await server.close()
}
