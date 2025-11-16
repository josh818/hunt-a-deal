// Temporary file to check API structure
fetch('https://cbk3yym2o7ktq2x44qnfo5xnhe0hpwxt.lambda-url.us-east-1.on.aws/api/v1/deals')
  .then(r => r.json())
  .then(data => {
    console.log('Total products:', data.count);
    
    // Find first product with coupon field
    const productWithCoupon = data.products.find(p => 
      Object.keys(p).some(k => k.toLowerCase().includes('coupon'))
    );
    
    if (productWithCoupon) {
      console.log('\nProduct with coupon field:');
      console.log(JSON.stringify(productWithCoupon, null, 2));
    } else {
      console.log('\nNo products with coupon field found');
      console.log('\nFirst product fields:', Object.keys(data.products[0]));
      console.log('\nFirst product:', JSON.stringify(data.products[0], null, 2));
    }
  });