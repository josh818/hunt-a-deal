// Extract coupon field from the fetched HTML
const fs = require('fs');
const html = fs.readFileSync('./tool-results://fetched-websites/cbk3yym2o7ktq2x44qnfo5xnhe0hpwxt.lambda-url.us-eas.html', 'utf8');

// Extract the JSON from the HTML body tag
const jsonMatch = html.match(/<body>(\{.*\})<\/body>/);
if (jsonMatch) {
  const data = JSON.parse(jsonMatch[1]);
  
  // Find first product with any coupon-related field
  for (let i = 0; i < Math.min(10, data.products.length); i++) {
    const product = data.products[i];
    const keys = Object.keys(product);
    const couponKeys = keys.filter(k => k.toLowerCase().includes('coupon'));
    
    if (couponKeys.length > 0) {
      console.log(`Product ${i} has coupon fields:`, couponKeys);
      console.log('Product data:', JSON.stringify(product, null, 2));
      break;
    }
  }
  
  // Also show all unique keys
  const allKeys = new Set();
  data.products.slice(0, 10).forEach(p => {
    Object.keys(p).forEach(k => allKeys.add(k));
  });
  console.log('\nAll field names in first 10 products:', Array.from(allKeys).sort());
}