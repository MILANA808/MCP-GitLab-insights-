#!/usr/bin/env node
import fs from 'node:fs';
const cfgPath = process.argv.includes('--config') ? process.argv[process.argv.indexOf('--config')+1] : './scripts/sample.config.json';
const mcp = process.env.MCP_GITLAB_SERVER_URL || '';
if (!mcp) {
  console.log('[AKSI] MCP_GITLAB_SERVER_URL not set — skipping insights (exit 0).');
  process.exit(0);
}

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
function today(){ return new Date().toISOString().slice(0,10); }

const cfgRaw = fs.readFileSync(cfgPath,'utf8');
const cfg = JSON.parse(cfgRaw);
ensureDir(cfg.outputDir || './reports');
const project = cfg.projects[0];
const out = {
  projectId: project.id,
  windowDays: cfg.sinceDays || 30,
  summary: { generatedAt: new Date().toISOString(), source: mcp },
  rows: []
};

// NOTE: Заглушка: здесь должна быть интеграция с MCP GitLab server.
// Чтобы не падать без сервера, пишем пустой, но валидный отчёт.
const stamp = today();
fs.writeFileSync(`${cfg.outputDir}/insights-${project.id}-${stamp}.json`, JSON.stringify(out,null,2));
fs.writeFileSync(`${cfg.outputDir}/insights-${project.id}-${stamp}.md`, `# GitLab Insights\n\n- Project: ${project.id}\n- Window: ${out.windowDays} days\n- Generated: ${out.summary.generatedAt}\n`);
console.log('[AKSI] Insights written to reports/.');
