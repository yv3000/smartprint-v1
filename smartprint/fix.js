const fs = require('fs');
let c = fs.readFileSync('components/admin/JobViewer.tsx', 'utf8');
c = c.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('components/admin/JobViewer.tsx', c);
