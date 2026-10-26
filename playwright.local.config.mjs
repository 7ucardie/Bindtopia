import base from './playwright.config.mjs';
export default {...base, projects: base.projects.map(p => ({...p, use: {...p.use, launchOptions: {...p.use.launchOptions, executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'}}}))};
