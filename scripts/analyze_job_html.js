const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'debug_emails', 'last_email.html');

try {
  const html = fs.readFileSync(filePath, 'utf8');
  
  // On cherche le titre exact d'une offre pour voir son conteneur
  const keyword = "Frontend Developer - Freelance";
  const index = html.indexOf(keyword);
  
  if (index === -1) {
    console.log("Keyword not found");
  } else {
    // On prend un contexte autour pour voir les balises parentes
    const start = Math.max(0, index - 500);
    const end = Math.min(html.length, index + 500);
    
    console.log("--- JOB ITEM HTML EXTRACT ---");
    console.log(html.substring(start, end));
  }
} catch (err) {
  console.error(err);
}
