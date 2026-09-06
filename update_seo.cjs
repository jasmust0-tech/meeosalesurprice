const fs = require('fs');

const meta = JSON.parse(fs.readFileSync('metadata.json', 'utf8'));
meta.name = "Stylish Kurtis & More | Premium Reseller Platform";
meta.description = "Discover a wide range of premium quality clothing, electronics, and groceries at wholesale prices. Order now for the best deals!";
fs.writeFileSync('metadata.json', JSON.stringify(meta, null, 2));

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<title>.*?<\/title>/, `<title>${meta.name}</title>`);
html = html.replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${meta.description}" />`);
html = html.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${meta.name}" />`);
html = html.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${meta.description}" />`);
fs.writeFileSync('index.html', html);

let hostingerHtmlPath = 'UPLOAD_TO_HOSTINGER_PUBLIC_HTML/index.html';
if (fs.existsSync(hostingerHtmlPath)) {
    let hHtml = fs.readFileSync(hostingerHtmlPath, 'utf8');
    hHtml = hHtml.replace(/<title>.*?<\/title>/, `<title>${meta.name}</title>`);
    hHtml = hHtml.replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${meta.description}" />`);
    hHtml = hHtml.replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${meta.name}" />`);
    hHtml = hHtml.replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${meta.description}" />`);
    fs.writeFileSync(hostingerHtmlPath, hHtml);
}
console.log("SEO details updated successfully.");
