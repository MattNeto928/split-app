import { GoogleGenerativeAI, Part, Content } from '@google/generative-ai';

// Hard-coded API key for development 
// In a production app, this would be fetched from environment variables
const API_KEY = 'REDACTED_GEMINI_KEY';

// Cache for API client to prevent multiple instantiations
let genAI: GoogleGenerativeAI | null = null;

// Get or create the Gemini API client
function getGenAI() {
  if (!genAI) {
    // Check if we have a stored key from setApiKey
    const storedKey = (global as any).GEMINI_API_KEY;
    genAI = new GoogleGenerativeAI(storedKey || API_KEY);
  }
  return genAI;
}

// Create a GLOBAL singleton to ensure we never call the API more than once per app session
// This is the most reliable way to prevent multiple calls
// This should persist regardless of component re-renders or navigation
let GLOBAL_API_CALL_MADE = false;
let GLOBAL_API_CALL_IN_PROGRESS = false; // Separate flag to track in-progress calls
let GLOBAL_API_RESULT: any = null;
const API_CALL_TIMEOUT = 15000; // 15 seconds

// LOG STATUS - helpful for debugging
console.log('🌎 GEMINI SERVICE LOADED - GLOBAL API CALL STATUS:', {
  GLOBAL_API_CALL_MADE,
  GLOBAL_API_CALL_IN_PROGRESS,
  hasGlobalResult: !!GLOBAL_API_RESULT,
  timeout: API_CALL_TIMEOUT
});

export async function analyzeReceipt(imageBase64: string) {
  try {
    // CRITICAL CHECK 1: If we already have a result, return it immediately
    if (GLOBAL_API_CALL_MADE && GLOBAL_API_RESULT) {
      console.log('🔒 GLOBAL API CALL ALREADY MADE - returning cached result to prevent duplicates');
      return GLOBAL_API_RESULT;
    }
    
    // CRITICAL CHECK 2: If call is in progress, throw error to prevent duplicate calls
    if (GLOBAL_API_CALL_IN_PROGRESS) {
      console.log('⚠️ API CALL ALREADY IN PROGRESS - rejecting new request');
      throw new Error('API request already in progress. Please wait.');
    }
    
    // CRITICAL CHECK 3: Set in-progress flag immediately
    GLOBAL_API_CALL_IN_PROGRESS = true;
    
    // Log the start of the API call with timestamp
    const now = Date.now();
    console.log(`🔥 GEMINI API CALL INITIATED at ${new Date(now).toISOString()}`);
    
    // Mark that we've attempted a global API call - only set this on successful completion
    // GLOBAL_API_CALL_MADE will be set at the end if successful
    console.log('🔒 Starting fresh API call, previous status:', { GLOBAL_API_CALL_MADE });
    
    // Use a stable Gemini Vision model - this model has better support for vision tasks
    // Using gemini-1.5-flash, which is more reliable than 2.0 for images
    const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Prepare the prompt with instructions and context
    const prompt = `Analyze this restaurant receipt image and return a JSON object with the following structure:
    {
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
    
    For example:
    {
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

    // Clean up the image data - handle different image formats
    let imageData = imageBase64;
    let mimeType = 'image/jpeg'; // Default MIME type
    
    // Extract MIME type and clean the data
    if (imageBase64.includes(',')) {
      const parts = imageBase64.split(',');
      
      // Try to extract the MIME type from the prefix
      const mimeMatch = parts[0].match(/data:(image\/[^;]+);base64/);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1];
      }
      
      // Extract just the base64 data
      imageData = parts[1];
    } else if (imageBase64.startsWith('data:image')) {
      // Extract MIME type if available
      const mimeMatch = imageBase64.match(/data:(image\/[^;]+);base64,/);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1];
      }
      
      // Remove the prefix
      imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    }
    
    // Check if we need to resize the data (Gemini API has size limits)
    // If the Base64 data is too large, we might need to handle it differently
    if (imageData.length > 1000000) { // Over ~1MB
      console.log('⚠️ WARNING: Image is very large, may exceed API limits');
    }
    
    // Process the image data if needed (resize/optimize)
    const processedImage = validateAndProcessImage(imageData, mimeType);
    imageData = processedImage.data;
    mimeType = processedImage.mimeType;
    
    console.log('Image data prepared:', { 
      length: imageData.length, 
      mimeType,
      sizeInMB: (imageData.length * 0.75 / 1024 / 1024).toFixed(2) + 'MB' // estimate size
    });
    
    // Process with Gemini - with timeout and retry
    let result;
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`API attempt ${attempts}/${maxAttempts}`);
        
        // Create a timeout promise - increase to 20 seconds for larger images
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API call timed out')), 20000)
        );
        
        // Race the API call against the timeout
        // Log image data details for debugging
        console.log('📷 Image details for Gemini API call:', {
          mimeType,
          dataLength: imageData.length,
          dataStart: imageData.substring(0, 20) + '...',
          dataEnd: '...' + imageData.substring(imageData.length - 20)
        });
        
        // Log key timestamps during processing
        console.log(`🕒 TIMESTAMP: Image processing complete, ready for API call at ${new Date().toISOString()}`);
        
        // Create the proper image part for Gemini API
        const imagePart: Part = {
          inlineData: {
            mimeType: mimeType,
            data: imageData,
          },
        };
        
        // Create generation config with temperature and response structure
        const generationConfig = {
          temperature: 0.2, // Low temperature for more deterministic but slightly more flexible outputs
          maxOutputTokens: 1024, // Ensure we get enough tokens for the response
        };
        
        console.log('🚀 GEMINI API CALL STARTED: Sending request to Gemini API...');
        console.log(`🔑 Using API KEY: ${API_KEY.substring(0, 6)}...${API_KEY.slice(-4)}`);
        
        const startTime = Date.now();
        try {
          // Execute the API call with a timeout
          result = await Promise.race([
            model.generateContent([
              prompt,
              imagePart
            ]),
            timeoutPromise
          ]);
          
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log(`✅ GEMINI API CALL SUCCESSFUL: Response received after ${duration}s`);
        } catch (err) {
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          console.error(`❌ GEMINI API CALL FAILED after ${duration}s:`, err);
          throw err;
        }
        
        // If we get here, the API call succeeded
        break;
      } catch (error) {
        console.error(`API attempt ${attempts} failed:`, error);
        if (attempts >= maxAttempts) {
          console.error('All API attempts failed');
          throw error;
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Extract the response text, handling the API response structure correctly
    let text;
    try {
      // Ensure we have the response object
      if (!result) {
        throw new Error('Invalid response from Gemini API');
      }
      
      const response = (result as any).response;
      text = response.text();
      console.log('Raw response from Gemini:', text);
    } catch (responseError) {
      console.error('Error extracting response text:', responseError);
      throw new Error('Failed to get text from API response');
    }
    
    // Clean up the text to make sure it's valid JSON
    // Sometimes Gemini returns markdown backticks or extra characters
    try {
      // Try to find JSON in the response if it's wrapped in backticks
      const jsonMatch = text.match(/```(?:json)?([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        text = jsonMatch[1].trim();
      } else {
        // If not wrapped in backticks, try to find the first '{' and last '}'
        const startIdx = text.indexOf('{');
        const endIdx = text.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          text = text.substring(startIdx, endIdx + 1);
        }
      }
      console.log('Cleaned JSON text:', text);
    } catch (e) {
      console.error('Error cleaning JSON:', e);
      throw new Error('Failed to clean JSON from Gemini response');
    }
    
    try {
      // Parse the JSON response
      const parsedResult = JSON.parse(text);
      console.log('Parsed JSON:', parsedResult);
      
      // Add default empty assignedTo array to each menu item and handle quantities
      const menuItems = Array.isArray(parsedResult.menuItems) 
        ? parsedResult.menuItems 
        : [];
      
      // Expand items with quantity > 1 into individual items
      let expandedMenuItems: any[] = [];
      let idCounter = 1;
      
      menuItems.forEach((item: any) => {
        // Default quantity to 1 if not specified
        const quantity = item.quantity || 1;
        
        // Log the item for debugging
        console.log(`Processing menu item: ${item.name}, price: ${item.price}, quantity: ${quantity}`);
        
        // For each item with quantity > 1, create multiple individual items
        for (let i = 0; i < quantity; i++) {
          // For items with quantity > 1, adjust the price to be per-item
          const individualPrice = quantity > 1 
            ? Number((item.price / quantity).toFixed(2)) 
            : item.price;
          
          // Format the name to indicate it's part of a quantity if needed
          const name = quantity > 1 
            ? `${item.name} (${i+1}/${quantity})` 
            : item.name;
          
          expandedMenuItems.push({
            name,
            price: individualPrice,
            id: idCounter.toString(),
            assignedTo: []
          });
          
          if (quantity > 1) {
            console.log(`  → Expanded item ${i+1}/${quantity}: ${name}, price: ${individualPrice}`);
          }
          
          idCounter++;
        }
      });
      
      // Log the expanded items summary
      console.log(`Expanded ${menuItems.length} menu items into ${expandedMenuItems.length} individual items`);
      
      // Construct the final result object with fallbacks for missing data
      const processedResult = {
        total: (parsedResult.total || 0).toString(),
        tax: (parsedResult.tax || 0).toString(),
        tip: (parsedResult.tip || 0).toString(),
        menuItems: expandedMenuItems,
        splitAmounts: [] // This will be calculated by the app based on assignments
      };
      
      // Store the result in our global cache to prevent future API calls
      GLOBAL_API_RESULT = processedResult;
      // ONLY now set the flag to indicate a successful API call was made
      GLOBAL_API_CALL_MADE = true;
      console.log('✅ Stored result in global cache and set GLOBAL_API_CALL_MADE=true');
      
      return processedResult;
    } catch (jsonError) {
      console.error('Error parsing JSON:', jsonError);
      // Reset the global flag so we can try again if this fails
      GLOBAL_API_CALL_MADE = false;
      throw new Error('Failed to parse receipt data. Please try again.');
    }
  } catch (error) {
    console.error('Error analyzing receipt:', error);
    // Reset the global flag so we can try again if this fails
    GLOBAL_API_CALL_MADE = false;
    throw new Error('Failed to analyze receipt. Please try again.');
  } finally {
    // Always reset the in-progress flag
    GLOBAL_API_CALL_IN_PROGRESS = false;
    console.log('Gemini API call completed at', new Date().toISOString());
    console.log('API call in-progress flag reset');
  }
}

// Simple utility function to potentially resize images if they're too large
// This is a placeholder - in a real app, you'd want a more sophisticated approach
// using libraries like react-native-image-manipulator or similar
function validateAndProcessImage(base64Data: string, mimeType: string): { data: string, mimeType: string } {
  // Check if the image is too large for the API
  if (base64Data.length > 1000000) { // Over ~1MB
    console.log('Image is large, might need processing in a real app');
    // In a real app, you would resize/compress the image here
  }
  
  return { data: base64Data, mimeType };
}

// When you want to use this in a real app, replace with your actual API key
// and implement proper API key management (env vars, secure storage, etc.)
export function setApiKey(key: string) {
  // Actually update the key in this implementation
  // Note: In a production app, you'd want to store this securely
  if (key && key.trim() !== '') {
    // For demonstration purposes - this would be handled differently in production
    (global as any).GEMINI_API_KEY = key;
    console.log('API key updated');
    
    // Reset the API client to use the new key
    genAI = new GoogleGenerativeAI(key);
    // Reset flags to allow new calls
    GLOBAL_API_CALL_IN_PROGRESS = false;
    
    // Don't reset the GLOBAL_API_CALL_MADE flag here - we want to maintain
    // that flag to prevent multiple calls per session
    
    return true;
  } else {
    console.error('Invalid API key provided');
    return false;
  }
}

// Export a function to reset all state - only use this in very specific situations!
export function resetApiState() {
  console.log('🔄 COMPLETE API STATE RESET requested');
  GLOBAL_API_CALL_MADE = false;
  GLOBAL_API_CALL_IN_PROGRESS = false;
  GLOBAL_API_RESULT = null;
  console.log('✅ API state completely reset');
  return true;
}