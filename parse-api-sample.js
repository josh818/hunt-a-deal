// Quick script to parse API and find coupon field
const fs = require('fs');

fetch('https://cbk3yym2o7ktq2x44qnfo5xnhe0hpwxt.lambda-url.us-east-1.on.aws/api/v1/deals')
  .then(r => r.json())
  .then(data => {
    // Find a product with coupon in any field
    const productWithCoupon = data.products.find(p => 
      JSON.stringify(p).toLowerCase().includes('coupon')
    );
    
    if (productWithCoupon) {
      console.log('Found product with coupon:');
      console.log(JSON.stringify(productWithCoupon, null, 2));
    } else {
      console.log('No coupon fields found');
      console.log('Sample product:', JSON.stringify(data.products[0], null, 2));
    }
  });