const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEALS_API_URL = "https://cbk3yym2o7ktq2x44qnfo5xnhe0hpwxt.lambda-url.us-east-1.on.aws/api/v1/deals";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const response = await fetch(DEALS_API_URL);
    const data = await response.json();
    
    // Get first 3 products to examine
    const sampleProducts = data.products?.slice(0, 3) || [];
    
    // Show all unique field names across samples
    const allFields = new Set();
    sampleProducts.forEach((product: any) => {
      Object.keys(product).forEach(key => allFields.add(key));
    });
    
    return new Response(
      JSON.stringify({
        totalProducts: data.count,
        allFieldNames: Array.from(allFields).sort(),
        sampleProducts: sampleProducts,
      }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});