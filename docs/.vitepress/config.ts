import { defineConfig } from 'vitepress';
import api from '../api.json';

export default defineConfig({
  title: 'necko7 Scripts',
  description: 'Rhai scripting API, workflows and recipes for channel automation.',
  lang: 'en-US',
  base: '/docs/scripting/',
  srcDir: 'site',
  outDir: '../dist/docs/scripting',
  cleanUrls: true,
  lastUpdated: false,
  markdown: { languageAlias: { rhai: 'rust' } },
  themeConfig: {
    nav: [{ text: 'Guide', link: '/getting-started' }, { text: 'API reference', link: '/reference/' }, { text: 'Cookbook', link: '/cookbook/' }],
    search: { provider: 'local' },
    outline: [2, 3],
    sidebar: [
      { text: 'Start here', items: [
        { text: 'Overview', link: '/' }, { text: 'Getting started', link: '/getting-started' }, { text: 'Rhai language', link: '/language' }, { text: 'Access and pairing', link: '/access' },
      ] },
      { text: 'Working with scripts', items: [
        { text: 'Projects, tests and timers', link: '/workflows' }, { text: 'Multi-file projects', link: '/multi-file' }, { text: 'Match observations', link: '/matches' }, { text: 'Failures and results', link: '/errors' }, { text: 'Sandbox and limits', link: '/limits' },
      ] },
      { text: 'API reference', collapsed: false, items: [
        { text: 'All APIs', link: '/reference/' }, { text: 'Context and data shapes', link: '/reference/data' }, { text: 'Semantic events', link: '/reference/events' },
        ...[...new Set(api.functions.map(f => f.namespace))].map(n => ({ text: n, link: '/reference/' + n.replaceAll('.', '-') })),
      ] },
      { text: 'Cookbook', items: [{ text: 'All recipes', link: '/cookbook/' }, { text: 'Ace to secret case', link: '/cookbook/ace-secret-case' }] },
    ],
    footer: { message: 'Observed data, explicit actions, no invented gameplay statistics.' },
  },
});
