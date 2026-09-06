const fs = require('fs');
let content = fs.readFileSync('data/kurtiProducts.ts', 'utf-8');

const blocks = content.split(/(\{\s*"id":\s*"[^"]+",)/);
let newContent = blocks[0];
for (let i = 1; i < blocks.length; i += 2) {
    let header = blocks[i];
    let body = blocks[i+1];
    
    // Update all items in this file, since they are all displayed under "Kurtis & Suits"
    body = body.replace(/"wholesalePrice":\s*[\d\.]+/, '"wholesalePrice": 149.0');
    body = body.replace(/"suggestedResellPrice":\s*[\d\.]+/, '"suggestedResellPrice": 149.0');
    
    newContent += header + body;
}

fs.writeFileSync('data/kurtiProducts.ts', newContent);
console.log("Updated data/kurtiProducts.ts");
