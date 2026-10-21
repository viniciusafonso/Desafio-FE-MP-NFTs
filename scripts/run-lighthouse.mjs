import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { chromium } from '@playwright/test'

const port = 4174
const baseUrl = process.env.LH_BASE_URL ?? `http://127.0.0.1:${port}`
const outputDir = new URL(process.env.LH_OUTPUT_DIR ?? '../reports/lighthouse/', import.meta.url)
const repeats = Math.max(1, Math.min(3, Number(process.env.LH_RUNS ?? 3)))
const categories = ['performance', 'accessibility', 'best-practices', 'seo']
const targets = [
  { name: 'home-desktop', path: '/', formFactor: 'desktop' },
  { name: 'detail-desktop', path: '/nfts/nft_beija_flor', formFactor: 'desktop' },
  { name: 'home-mobile', path: '/', formFactor: 'mobile' },
  { name: 'detail-mobile', path: '/nfts/nft_beija_flor', formFactor: 'mobile' },
]
const thresholds = {
  performance: 90,
  accessibility: 95,
  'best-practices': 95,
  seo: 90,
}

function emulation(formFactor) {
  if (formFactor === 'mobile') {
    return { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false }
  }
  return { mobile: false, width: 1440, height: 1000, deviceScaleFactor: 1, disabled: false }
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right)
  return ordered[Math.floor(ordered.length / 2)]
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {
      // O preview ainda está iniciando.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('O preview não respondeu a tempo.')
}

await mkdir(outputDir, { recursive: true })
const preview = process.env.LH_BASE_URL ? undefined : spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)], {
  stdio: 'inherit',
  env: process.env,
})

let chrome
try {
  await waitForServer()
  chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-first-run', '--no-default-browser-check'],
  })

  const summary = []
  for (const target of targets.filter((target) => !process.env.LH_TARGETS || process.env.LH_TARGETS.split(',').includes(target.name))) {
    const runs = []
    for (let run = 1; run <= repeats; run += 1) {
      const result = await lighthouse(
        `${baseUrl}${target.path}`,
        {
          port: chrome.port,
          output: ['json', 'html'],
          logLevel: 'error',
        },
        {
          ...(target.formFactor === 'desktop' ? desktopConfig : { extends: 'lighthouse:default' }),
          settings: {
            ...(target.formFactor === 'desktop' ? desktopConfig.settings : {}),
            onlyCategories: categories,
            formFactor: target.formFactor,
            screenEmulation: emulation(target.formFactor),
            throttlingMethod: 'simulate',
            locale: 'pt-BR',
          },
        },
      )
      if (!result) throw new Error(`Lighthouse não retornou resultado para ${target.name}.`)

      await writeFile(
        new URL(`${target.name}-run-${run}.json`, outputDir),
        JSON.stringify(result.lhr, null, 2),
      )
      await writeFile(new URL(`${target.name}-run-${run}.html`, outputDir), Array.isArray(result.report) ? result.report[1] : result.report)
      runs.push({
        performance: Math.round((result.lhr.categories.performance?.score ?? 0) * 100),
        accessibility: Math.round((result.lhr.categories.accessibility?.score ?? 0) * 100),
        'best-practices': Math.round((result.lhr.categories['best-practices']?.score ?? 0) * 100),
        seo: Math.round((result.lhr.categories.seo?.score ?? 0) * 100),
        lcpMs: Math.round(result.lhr.audits['largest-contentful-paint']?.numericValue ?? 0),
        cls: Number((result.lhr.audits['cumulative-layout-shift']?.numericValue ?? 0).toFixed(4)),
        tbtMs: Math.round(result.lhr.audits['total-blocking-time']?.numericValue ?? 0),
      })
    }

    const medians = Object.fromEntries(
      Object.keys(runs[0]).map((key) => [key, median(runs.map((run) => run[key]))]),
    )
    const meetsTargets = Object.entries(thresholds).every(([key, value]) => medians[key] >= value)
    summary.push({ ...target, runs, medians, meetsTargets })
  }

  await writeFile(new URL('lighthouse-summary.json', outputDir), JSON.stringify({
    generatedAt: new Date().toISOString(),
    baseUrl,
    environment: { node: process.version, platform: process.platform, architecture: process.arch, chromium: (await chromium.launch().then(async (browser) => { const version = browser.version(); await browser.close(); return version })), lighthouse: '13.5.0' },
    thresholds,
    targets: summary,
  }, null, 2))

  const lines = [
    '# Lighthouse',
    '',
    `${repeats} execuções por página e formato. Os valores abaixo são as medianas; os JSON completos preservam cada execução.`,
    '',
  ]
  for (const result of summary) {
    const misses = []
    if (result.medians.performance < thresholds.performance) {
      misses.push(
        `Performance abaixo da meta: LCP mediano de ${result.medians.lcpMs} ms. Consulte os diagnósticos da execução para identificar as oportunidades; a medição mantém imagens, fontes, MSW e persistência ativos.`,
      )
    }
    if (result.medians.accessibility < thresholds.accessibility) {
      misses.push('Acessibilidade abaixo da meta: consulte os audits ARIA e de hierarquia de títulos no JSON desta execução.')
    }
    if (result.medians['best-practices'] < thresholds['best-practices']) {
      misses.push('Boas práticas abaixo da meta: consulte os audits com score zero no JSON desta execução.')
    }
    if (result.medians.seo < thresholds.seo) {
      misses.push('SEO abaixo da meta: consulte os audits de indexação no JSON desta execução.')
    }
    lines.push(
      `## ${result.name}`,
      '',
      `- Performance: ${result.medians.performance}`,
      `- Acessibilidade: ${result.medians.accessibility}`,
      `- Boas práticas: ${result.medians['best-practices']}`,
      `- SEO: ${result.medians.seo}`,
      `- LCP: ${result.medians.lcpMs} ms`,
      `- CLS: ${result.medians.cls}`,
      `- TBT: ${result.medians.tbtMs} ms`,
      `- Metas atendidas: ${result.meetsTargets ? 'sim' : 'não'}`,
      '',
      ...misses.map((miss) => `- Justificativa: ${miss}`),
      ...(misses.length > 0 ? [''] : []),
    )
  }
  await writeFile(new URL('results.md', outputDir), `${lines.join('\n')}\n`)
  console.log(JSON.stringify(summary.map(({ name, medians, meetsTargets }) => ({ name, medians, meetsTargets })), null, 2))
} finally {
  await chrome?.kill()
  preview?.kill('SIGTERM')
}
