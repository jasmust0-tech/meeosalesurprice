const fs = require('fs');
let content = fs.readFileSync('data/kurtiProducts.ts', 'utf-8');

// We can parse the file content as a string.
// We need to find objects that have "category": "women-kurti" and update their wholesalePrice and suggestedResellPrice.
// Since it's a standard format, we can split by '{\n' and '  },' or similar, but a regex approach might be easier if we match the block.

const blocks = content.split(/(\{\s*"id":\s*"[^"]+",)/);
// blocks[0] is everything before the first id
// blocks[1] is '{\n    "id": "...",'
// blocks[2] is the rest of the object
let newContent = blocks[0];
for (let i = 1; i < blocks.length; i += 2) {
    let header = blocks[i];
    let body = blocks[i+1];
    
    if (body.includes('"category": "women-kurti"')) {
        body = body.replace(/"wholesalePrice":\s*[\d\.]+/, '"wholesalePrice": 149.0');
        body = body.replace(/"suggestedResellPrice":\s*[\d\.]+/, '"suggestedResellPrice": 149.0');
    }
    
    newContent += header + body;
}

fs.writeFileSync('data/kurtiProducts.ts', newContent);
console.log("Updated data/kurtiProducts.ts");
