'use strict';

const fs = require('node:fs');
const path = require('node:path');

const destination = process.argv[2];
const url = process.env.OA_SUPABASE_URL;
const key = process.env.OA_SUPABASE_PUBLISHABLE_KEY;
if (!destination || !url || !key) throw new Error('Set OA_SUPABASE_URL and OA_SUPABASE_PUBLISHABLE_KEY before building the public site.');
const parsed = new URL(url);
if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) throw new Error('OA_SUPABASE_URL must be a valid HTTPS Supabase project URL.');
const source = "(function (window) {\n  'use strict';\n  window.OA_CONFIG = { backend:'supabase', supabaseUrl:" + JSON.stringify(parsed.origin) + ', supabasePublishableKey:' + JSON.stringify(key) + " };\n})(window);\n";
fs.mkdirSync(path.dirname(destination), { recursive:true });
fs.writeFileSync(destination, source, { encoding:'utf8', mode:0o644 });
