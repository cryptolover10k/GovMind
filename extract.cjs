const fs = require('fs');
const content = fs.readFileSync('C:/Users/pc/.gemini/antigravity/brain/5955eb1c-c097-4524-a544-aece401477f1/.system_generated/steps/5/content.md', 'utf8');
const lines = content.split('\n');
let print = false;
let output = [];
lines.forEach(l => {
  if(l.includes('id="panel-email-otp-1"')) print = true;
  if(print && l.includes('id="panel-pin-2"')) print = false;
  if(print) output.push(l.substring(0, 300));
});
fs.writeFileSync('email_otp_guide.txt', output.join('\n'));
