const fs = require('node:fs');
const path = require('node:path');
const filename = process.argv[2];
const version = process.argv[3];
if (!filename) throw new Error('HTML path is required');
if (!/^\d+\.\d+\.\d+-\d+$/.test(version || '')) throw new Error('Packaged version is required');
let html = fs.readFileSync(filename, 'utf8');
if (!html.includes('</head>') || !html.includes('id="notepad-selector"')) throw new Error('Unsupported upstream HTML contract');
if (!html.includes('compact-toolbar.css')) {
  html = html.replace('</head>', `<link rel="stylesheet" href="Assets/compact-toolbar.css?v=${version}">\n<script defer src="Assets/compact-toolbar.js?v=${version}"></script>\n</head>`);
  fs.writeFileSync(filename, html);
}
const packageFile = path.join(path.dirname(filename), '../package.json');
const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
pkg.version = version;
fs.writeFileSync(packageFile, JSON.stringify(pkg, null, 2) + '\n');
// A changed worker activates the upstream version-based cache refresh for existing clients.
fs.appendFileSync(path.join(path.dirname(filename), 'service-worker.js'), `\n// HA package ${version}\n`);
