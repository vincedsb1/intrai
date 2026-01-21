const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'debug_emails', 'last_email.html');

try {
  const html = fs.readFileSync(filePath, 'utf8');
  
  // On cherche la première occurrence d'une offre (Twine)
  const keyword = "Twine";
  const index = html.indexOf(keyword);
  
  if (index === -1) {
    console.log("Keyword not found");
  } else {
    // On prend un contexte large autour (avant et après) pour voir le conteneur
    // On cherche le début du tableau conteneur
    const start = Math.max(0, index - 1000);
    const end = Math.min(html.length, index + 3000);
    
    console.log("--- HTML EXTRACT ---");
    console.log(html.substring(start, end));
  }
} catch (err) {
  console.error(err);
}
