const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'debug_emails', 'last_email.html');

try {
  const html = fs.readFileSync(filePath, 'utf8');
  
  // Recherche de logo d'entreprise (souvent media.licdn.com/dms/image...)
  const regex = /media\.licdn\.com\/dms\/image/g;
  const match = regex.exec(html);
  
  if (!match) {
    console.log("Logo pattern not found. Dumping raw HTML around 'Twine' again with larger context.");
    const index = html.indexOf("Twine");
    const start = Math.max(0, index - 2000);
    const end = Math.min(html.length, index + 5000);
    console.log(html.substring(start, end));
  } else {
    console.log("Logo found at index", match.index);
    const start = Math.max(0, match.index - 1000);
    const end = Math.min(html.length, match.index + 2000);
    console.log("--- LOGO CONTEXT ---");
    console.log(html.substring(start, end));
  }
} catch (err) {
  console.error(err);
}
