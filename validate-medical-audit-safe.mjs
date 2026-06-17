import fs from'node:fs';
try{await import('./validate-medical-audit.mjs');}
catch(error){fs.writeFileSync('medical-audit-validation-v2.json',JSON.stringify({passed:false,executionError:String(error?.stack||error)},null,2)+'\n');console.error(error);}
