#!/usr/bin/env node
// AKSI minimal MCP GitLab insights (real fetch with graceful fallback)
import fs from 'node:fs';
const cfgPath = process.argv.includes('--config') ? process.argv[process.argv.indexOf('--config')+1] : './scripts/sample.config.json';
const mcp = process.env.MCP_GITLAB_SERVER_URL || '';
function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
function today(){ return new Date().toISOString().slice(0,10); }
function hDiff(a,b){ return (new Date(b).getTime()-new Date(a).getTime())/36e5; }
async function fetchJson(url){ const r = await fetch(url); if(!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json(); }

(async () => {
  const cfg = JSON.parse(fs.readFileSync(cfgPath,'utf8'));
  ensureDir(cfg.outputDir || './reports');
  const project = cfg.projects[0];
  const stamp = today();
  let rows = [];
  let error = null;

  if (!mcp) {
    error = 'MCP_GITLAB_SERVER_URL not set';
  } else {
    try {
      // Expected endpoints (adjust to your MCP server):
      // /mcp/gitlab/projects/:id/merge_requests?state=all
      const base = mcp.replace(//$/, '');
      const mrs = await fetchJson(`${base}/mcp/gitlab/projects/${project.id}/merge_requests?state=all`);
      rows = (mrs||[]).map(m => ({
        mr: m.iid,
        title: m.title,
        author: m.author || m.author_name || '-',
        merged: !!m.merged_at || m.state === 'merged',
        cycleTimeH: m.merged_at ? hDiff(m.created_at, m.merged_at) : null,
        leadTimeH: m.merged_at ? hDiff(m.created_at /* TODO: first commit time */, m.merged_at) : null,
        firstReviewLatencyH: m.first_review_at ? hDiff(m.created_at, m.first_review_at) : null
      }));
    } catch(e){
      error = String(e && e.message || e);
    }
  }

  const out = {
    projectId: project.id,
    windowDays: cfg.sinceDays || 30,
    generatedAt: new Date().toISOString(),
    source: mcp || null,
    error: error,
    rows
  };

  fs.writeFileSync(`${cfg.outputDir}/insights-${project.id}-${stamp}.json`, JSON.stringify(out,null,2));
  const md = [
    '# GitLab Insights',
    `- Project: ${project.id}`,
    `- Window: ${out.windowDays} days`,
    `- Generated: ${out.generatedAt}`,
    error ? `- Error: ${error}` : `- Rows: ${rows.length}`,
    '',
    ...rows.slice(0,50).map(r => `- MR !${r.mr} — ${r.title} — ${r.author} — cycle: ${r.cycleTimeH?.toFixed?.(1) ?? '–'}h — lead: ${r.leadTimeH?.toFixed?.(1) ?? '–'}h — merged: ${r.merged ? 'yes' : 'no'}`)
  ].join('
');
  fs.writeFileSync(`${cfg.outputDir}/insights-${project.id}-${stamp}.md`, md);
  console.log('[AKSI] Insights written to reports/.', error ? `(note: ${error})` : '');
})();
