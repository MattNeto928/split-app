import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// API key is stored securely in Vercel environment variables
const API_KEY = process.env.GEMINI_API_KEY || "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Lightweight health check — used by keep-warm pings to prevent cold starts.
  // Returns immediately and never calls Gemini, so it's free to hit often.
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, service: "analyze-receipt" });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check for API key
  if (!API_KEY) {
    console.error("GEMINI_API_KEY environment variable is not set");
    return res.status(500).json({ error: "Server configuration error: API key not set" });
  }

  // Basic request validation
  if (!req.body || !req.body.imageBase64) {
    return res.status(400).json({ error: "Missing imageBase64 in request body" });
  }

  const { imageBase64, mimeType = "image/jpeg" } = req.body;

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `Analyze this restaurant receipt image and return a JSON object with the following structure:
    {
      "restaurantName": "name of the restaurant (if not found, return null)",
      "total": total amount as number without currency symbol,
      "tax": tax amount as number without currency symbol,
      "tip": tip amount as number without currency symbol (0 if not present),
      "menuItems": [
        {
          "name": "name of the menu item",
          "price": price as number without currency symbol,
          "quantity": quantity as number (default to 1 if not specified)
        },
        ...more items
      ]
    }
    
    IMPORTANT GUIDELINES:
    1. All numeric values should be numbers, NOT strings (e.g., 10.99 not "$10.99")
    2. Extract individual menu items with their exact names and prices
    3. CRITICALLY IMPORTANT: Look for quantities in the receipt such as:
       - Items with "x2", "2x", "(2)", "qty: 2", "quantity: 2", etc.
       - Always set the "quantity" field for these items (e.g., quantity: 2)
       - The "price" should be the TOTAL price for all items, not the per-item price
       - For example, if "2x Burger $10.00" appears, set price: 10.00, quantity: 2
       - Do NOT modify item names to include quantities
    4. Do NOT calculate splits or assign items to people
    5. Include ALL visible menu items, even if unclear or partially visible
    6. For unclear prices, make a reasonable estimate based on similar items
    7. If tax or tip is not visible, provide a reasonable estimate
    8. Return ONLY the JSON object with no additional text or explanations
    9. CRITICALLY IMPORTANT: The total amount should be consistent with the sum of all item prices plus tax. 
       If there's a discrepancy, double-check all prices and make sure they're correct.
    10. Make sure all item prices are correctly parsed. Common receipt issues include:
       - Mistaking item descriptions for prices
       - Missing decimal points in prices
       - Misreading prices from other columns (like quantity numbers)
       - Make sure to only include the actual price in the price field
    11. For restaurant name extraction:
       - Look for the restaurant name at the top of the receipt
       - Check for business names, store names, or establishment names
       - If no clear restaurant name is found, return null for restaurantName
       - Do not include addresses, phone numbers, or other business details in the name
       - If the name includes "Restaurant", "Cafe", "Bar", etc., keep it as part of the name
    
    For example:
    {
      "restaurantName": "Joe's Pizzeria",
      "total": 42.75,
      "tax": 3.50,
      "tip": 8.55,
      "menuItems": [
        { "name": "Chicken Pasta", "price": 12.99, "quantity": 1 },
        { "name": "Caesar Salad", "price": 8.95, "quantity": 1 },
        { "name": "Garlic Bread", "price": 9.00, "quantity": 2 },
        { "name": "Iced Tea", "price": 8.85, "quantity": 3 },
        { "name": "Tiramisu", "price": 6.95, "quantity": 1 }
      ]
    }`;

    const imagePart: Part = {
      inlineData: {
        mimeType: mimeType,
        data: imageBase64,
      },
    };

    console.log("Calling Gemini API...");
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    let text = response.text();
    console.log("Gemini response received");

    // Clean up the response to extract JSON
    const jsonMatch = text.match(/```(?:json)?([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      text = jsonMatch[1].trim();
    } else {
      const startIdx = text.indexOf("{");
      const endIdx = text.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        text = text.substring(startIdx, endIdx + 1);
      }
    }

    const parsedResult = JSON.parse(text);
    console.log("Successfully parsed receipt");

    return res.status(200).json(parsedResult);
  } catch (error: any) {
    console.error("Error analyzing receipt:", error);
    return res.status(500).json({ 
      error: "Failed to analyze receipt", 
      details: error.message 
    });
  }
}
