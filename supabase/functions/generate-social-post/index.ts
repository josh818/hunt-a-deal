import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { deal, trackedUrl, pageUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create an engaging prompt for the AI
    const prompt = `Create an engaging social media post for this product deal:

Product: ${deal.title}
Brand: ${deal.brand || "N/A"}
Category: ${deal.category || "N/A"}
Current Price: $${deal.price.toFixed(2)}
${deal.originalPrice ? `Original Price: $${deal.originalPrice.toFixed(2)}` : ""}
${deal.discount ? `Discount: ${Math.round(deal.discount)}% OFF` : ""}

Requirements:
- Make it exciting and attention-grabbing
- Highlight the savings if there's a discount
- Keep it under 280 characters
- Include relevant emojis
- End with "Check it out here: ${pageUrl}"
- Do NOT include any hashtags
- Sound enthusiastic but not overly salesy`;

    console.log("Generating social post with AI...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a social media expert who creates engaging, concise posts that drive clicks. Be enthusiastic but authentic.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      throw new Error("No text generated");
    }

    console.log("Social post generated successfully");

    return new Response(
      JSON.stringify({
        text: generatedText,
        url: trackedUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating social post:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
