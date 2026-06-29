// ==============================================================
// SECURE BACKEND URL - Replace with your Vercel deployment URL
// ==============================================================
// After deploying the backend folder to Vercel, update this URL.
// Example: "https://split-api-backend.vercel.app"
const BACKEND_URL = "https://split-serverless.vercel.app";
// ==============================================================

// Create a GLOBAL singleton to ensure we never call the API more than once per app session
// This is the most reliable way to prevent multiple calls
// This should persist regardless of component re-renders or navigation
let GLOBAL_API_CALL_MADE = false;
let GLOBAL_API_CALL_IN_PROGRESS = false; // Separate flag to track in-progress calls
let GLOBAL_API_RESULT: any = null;
const API_CALL_TIMEOUT = 60000; // 60 seconds (1 minute)

// Create a GLOBAL singleton to track receipt count
let GLOBAL_RECEIPT_COUNT = 0;

// How long we'll wait on the network request before aborting (60s) — matches
// the backend function's maxDuration so we never abort a request the server
// would have finished.
const REQUEST_TIMEOUT_MS = 60000;

// LOG STATUS - helpful for debugging
console.log("🌎 GEMINI SERVICE LOADED - GLOBAL API CALL STATUS:", {
  GLOBAL_API_CALL_MADE,
  GLOBAL_API_CALL_IN_PROGRESS,
  hasGlobalResult: !!GLOBAL_API_RESULT,
  timeout: API_CALL_TIMEOUT,
  requestTimeout: REQUEST_TIMEOUT_MS,
});

// ==============================================================
// TYPED ERROR INFRASTRUCTURE
// ==============================================================
// Callers (e.g. review.tsx) can catch AnalyzeError and branch on `.kind`,
// show `.userMessage` directly in UI, and offer a retry when `.retryable`.
export type AnalyzeErrorKind =
  | "network"
  | "timeout"
  | "server"
  | "parse"
  | "empty"
  | "unknown";

const USER_MESSAGES: Record<AnalyzeErrorKind, string> = {
  network:
    "Couldn't reach the server. Check your connection and try again.",
  timeout: "This is taking longer than expected. Try again.",
  server: "Something went wrong on our end. Please try again.",
  parse: "We had trouble reading that receipt. Try again.",
  empty: "Couldn't read any items on that receipt. Try retaking the photo.",
  unknown: "Something went wrong. Please try again.",
};

// network / timeout / server are transient and worth retrying. empty is not
// (the photo itself is the problem); parse / unknown default to not retryable.
const RETRYABLE: Record<AnalyzeErrorKind, boolean> = {
  network: true,
  timeout: true,
  server: true,
  parse: false,
  empty: false,
  unknown: false,
};

export class AnalyzeError extends Error {
  kind: AnalyzeErrorKind;
  retryable: boolean;
  userMessage: string;

  constructor(
    kind: AnalyzeErrorKind,
    opts?: { userMessage?: string; cause?: unknown }
  ) {
    const userMessage = opts?.userMessage ?? USER_MESSAGES[kind];
    super(userMessage);
    this.name = "AnalyzeError";
    this.kind = kind;
    this.retryable = RETRYABLE[kind];
    this.userMessage = userMessage;
    if (opts?.cause !== undefined) {
      // Preserve the original error for logging/debugging without surfacing it.
      (this as any).cause = opts.cause;
    }
    // Restore the prototype chain (needed when targeting ES5).
    Object.setPrototypeOf(this, AnalyzeError.prototype);
  }
}

// Detect the AbortController timeout firing vs. a genuine network failure.
function isAbortError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    (err as any).name === "AbortError"
  );
}

export async function analyzeReceipt(imageBase64: string) {
  try {
    // CRITICAL CHECK 1: If we already have a result, return it immediately
    if (GLOBAL_API_CALL_MADE && GLOBAL_API_RESULT) {
      console.log(
        "🔒 GLOBAL API CALL ALREADY MADE - returning cached result to prevent duplicates"
      );
      return GLOBAL_API_RESULT;
    }

    // CRITICAL CHECK 2: If call is in progress, throw error to prevent duplicate calls
    if (GLOBAL_API_CALL_IN_PROGRESS) {
      console.log("⚠️ API CALL ALREADY IN PROGRESS - rejecting new request");
      throw new AnalyzeError("unknown", {
        userMessage: "A scan is already in progress. Please wait.",
      });
    }

    // CRITICAL CHECK 3: Set in-progress flag immediately
    GLOBAL_API_CALL_IN_PROGRESS = true;

    // Log the start of the API call with timestamp
    const now = Date.now();
    console.log(
      `🔥 GEMINI API CALL INITIATED at ${new Date(now).toISOString()}`
    );

    // Mark that we've attempted a global API call - only set this on successful completion
    // GLOBAL_API_CALL_MADE will be set at the end if successful
    console.log("🔒 Starting fresh API call, previous status:", {
      GLOBAL_API_CALL_MADE,
    });

    // Clean up the image data - handle different image formats
    let imageData = imageBase64;
    let mimeType = "image/jpeg"; // Default MIME type

    // Extract MIME type and clean the data
    if (imageBase64.includes(",")) {
      const parts = imageBase64.split(",");

      // Try to extract the MIME type from the prefix
      const mimeMatch = parts[0].match(/data:(image\/[^;]+);base64/);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1];
      }

      // Extract just the base64 data
      imageData = parts[1];
    } else if (imageBase64.startsWith("data:image")) {
      // Extract MIME type if available
      const mimeMatch = imageBase64.match(/data:(image\/[^;]+);base64,/);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1];
      }

      // Remove the prefix
      imageData = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    }

    // Check if we need to resize the data
    if (imageData.length > 1000000) {
      console.log("⚠️ WARNING: Image is very large, may exceed API limits");
    }

    // Process the image data if needed (resize/optimize)
    const processedImage = validateAndProcessImage(imageData, mimeType);
    imageData = processedImage.data;
    mimeType = processedImage.mimeType;

    console.log("Image data prepared:", {
      length: imageData.length,
      mimeType,
      sizeInMB: ((imageData.length * 0.75) / 1024 / 1024).toFixed(2) + "MB",
    });

    // Call the secure backend API instead of Gemini directly
    console.log("🚀 Calling secure backend API...");
    const startTime = Date.now();

    // Abort the request if it runs past our timeout window.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${BACKEND_URL}/api/analyze-receipt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: imageData,
          mimeType: mimeType,
        }),
        signal: controller.signal,
      });
    } catch (fetchError) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      if (isAbortError(fetchError)) {
        console.error(`⌛ Backend API call timed out after ${duration}s`);
        throw new AnalyzeError("timeout", { cause: fetchError });
      }
      console.error(
        `❌ Backend API call failed (network) after ${duration}s:`,
        fetchError
      );
      throw new AnalyzeError("network", { cause: fetchError });
    } finally {
      // Always clear the timer so it can't fire after completion.
      clearTimeout(timeoutId);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Preserve the backend-provided message for logging, but show a friendly
      // default to the user.
      const backendMessage =
        typeof errorData?.error === "string" ? errorData.error : undefined;
      console.error(
        `❌ Backend API call failed after ${duration}s (status ${response.status}):`,
        errorData
      );
      throw new AnalyzeError("server", {
        userMessage: backendMessage
          ? `${USER_MESSAGES.server} (${backendMessage})`
          : USER_MESSAGES.server,
        cause: errorData,
      });
    }

    console.log(`✅ Backend API call successful after ${duration}s`);
    const parsedResult = await response.json();

    try {
      // The backend already returns parsed JSON
      console.log("Parsed JSON:", parsedResult);

      // Increment the global receipt count
      GLOBAL_RECEIPT_COUNT++;

      // If no restaurant name is found, use the receipt number
      if (!parsedResult.restaurantName) {
        parsedResult.restaurantName = `Receipt #${GLOBAL_RECEIPT_COUNT}`;
      }

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
        console.log(
          `Processing menu item: ${item.name}, price: ${item.price}, quantity: ${quantity}`
        );

        // For each item with quantity > 1, create multiple individual items
        for (let i = 0; i < quantity; i++) {
          // For items with quantity > 1, adjust the price to be per-item
          const individualPrice =
            quantity > 1
              ? Number((item.price / quantity).toFixed(2))
              : item.price;

          // Format the name to indicate it's part of a quantity if needed
          const name =
            quantity > 1 ? `${item.name} (${i + 1}/${quantity})` : item.name;

          expandedMenuItems.push({
            name,
            price: individualPrice,
            id: idCounter.toString(),
            assignedTo: [],
          });

          if (quantity > 1) {
            console.log(
              `  → Expanded item ${
                i + 1
              }/${quantity}: ${name}, price: ${individualPrice}`
            );
          }

          idCounter++;
        }
      });

      // Log the expanded items summary
      console.log(
        `Expanded ${menuItems.length} menu items into ${expandedMenuItems.length} individual items`
      );

      // If the receipt yielded no usable items, surface a non-retryable
      // "empty" error so the user knows to retake the photo rather than retry.
      if (expandedMenuItems.length === 0) {
        console.log("⚠️ No menu items could be read from the receipt");
        throw new AnalyzeError("empty");
      }

      // Calculate the sum of all menu items to verify totals
      const calculatedItemsTotal = expandedMenuItems.reduce(
        (sum, item) => sum + (item.price || 0),
        0
      );

      // Check for items with suspiciously high or low prices
      const suspiciousItems = expandedMenuItems.filter((item) => {
        return item.price <= 0 || item.price > 100; // Suspicious if free or extremely expensive
      });

      if (suspiciousItems.length > 0) {
        console.log("⚠️ Found suspicious item prices:");
        suspiciousItems.forEach((item) => {
          console.log(`  - ${item.name}: $${item.price.toFixed(2)}`);
        });
      }

      // Get the parsed values
      const parsedTotal = parsedResult.total || 0;
      const parsedTax = parsedResult.tax || 0;
      const parsedTip = parsedResult.tip || 0;

      console.log("Verification check:");
      console.log(`Parsed total: ${parsedTotal}`);
      console.log(
        `Calculated sum of all items: ${calculatedItemsTotal.toFixed(2)}`
      );
      console.log(`Parsed tax: ${parsedTax}`);
      console.log(`Parsed tip: ${parsedTip}`);

      // Verify if the total is consistent with the sum of items + tax
      // If there's a significant discrepancy, use the calculated value
      const expectedTotal = calculatedItemsTotal + parsedTax;
      const totalDiscrepancy = Math.abs(parsedTotal - expectedTotal);
      const discrepancyPercent = (totalDiscrepancy / expectedTotal) * 100;

      console.log(`Expected total (items + tax): ${expectedTotal.toFixed(2)}`);
      console.log(
        `Discrepancy: ${totalDiscrepancy.toFixed(
          2
        )} (${discrepancyPercent.toFixed(2)}%)`
      );

      // If there's a large discrepancy (more than 10%), use the calculated values
      let finalTotal = parsedTotal;
      let finalTax = parsedTax;

      // Calculate the apparent tax rate
      const apparentTaxRate = parsedTax / calculatedItemsTotal;
      console.log(`Apparent tax rate: ${(apparentTaxRate * 100).toFixed(2)}%`);

      // Check if the tax rate seems reasonable (usually between 5-15%)
      const isReasonableTaxRate =
        apparentTaxRate >= 0.05 && apparentTaxRate <= 0.15;
      console.log(`Tax rate seems reasonable: ${isReasonableTaxRate}`);

      // Check for discrepancies and fix if needed
      if (discrepancyPercent > 10) {
        console.log(
          "⚠️ Large discrepancy detected! Using calculated values instead of parsed values"
        );

        // Tax rate check - if it doesn't seem reasonable, estimate it
        if (!isReasonableTaxRate) {
          // Use 8% as a reasonable tax rate estimate
          finalTax = Math.round(calculatedItemsTotal * 0.08 * 100) / 100; // ~8% tax rate, rounded to 2 decimals
          console.log(
            `Tax rate of ${(apparentTaxRate * 100).toFixed(
              2
            )}% seems incorrect. Estimated new tax: ${finalTax.toFixed(2)}`
          );
        }

        // Recalculate total based on items plus calculated tax
        finalTotal = calculatedItemsTotal + finalTax;
        console.log(`Recalculated total: ${finalTotal.toFixed(2)}`);
      } else {
        // Even if the discrepancy is small, check if tax rate is unreasonable
        if (!isReasonableTaxRate && calculatedItemsTotal > 0) {
          console.log(
            `⚠️ Tax rate of ${(apparentTaxRate * 100).toFixed(
              2
            )}% seems unusual`
          );

          // Only override if it's really off
          if (apparentTaxRate < 0.01 || apparentTaxRate > 0.2) {
            finalTax = Math.round(calculatedItemsTotal * 0.08 * 100) / 100;
            console.log(`Using estimated tax: ${finalTax.toFixed(2)}`);

            // Update total to match
            finalTotal = calculatedItemsTotal + finalTax;
            console.log(`Updated total to match: ${finalTotal.toFixed(2)}`);
          }
        }
      }

      // Construct the final result object with verified values
      const processedResult = {
        restaurantName: parsedResult.restaurantName,
        total: finalTotal.toString(),
        tax: finalTax.toString(),
        tip: (parsedTip || 0).toString(),
        menuItems: expandedMenuItems,
        splitAmounts: [], // This will be calculated by the app based on assignments
      };

      // Store the result in our global cache to prevent future API calls
      GLOBAL_API_RESULT = processedResult;
      // ONLY now set the flag to indicate a successful API call was made
      GLOBAL_API_CALL_MADE = true;
      console.log(
        "✅ Stored result in global cache and set GLOBAL_API_CALL_MADE=true"
      );

      return processedResult;
    } catch (jsonError) {
      // Reset the global flag so we can try again if this fails
      GLOBAL_API_CALL_MADE = false;
      // Already-typed errors (e.g. the "empty" case above) pass through.
      if (jsonError instanceof AnalyzeError) {
        throw jsonError;
      }
      console.error("Error parsing JSON:", jsonError);
      throw new AnalyzeError("parse", { cause: jsonError });
    }
  } catch (error) {
    // Reset the global flag so we can try again if this fails
    GLOBAL_API_CALL_MADE = false;
    // Re-throw typed errors untouched so callers can inspect kind/userMessage.
    if (error instanceof AnalyzeError) {
      console.error(
        `Error analyzing receipt [${error.kind}]:`,
        (error as any).cause ?? error
      );
      throw error;
    }
    // Anything unexpected becomes a generic, friendly AnalyzeError.
    console.error("Error analyzing receipt:", error);
    throw new AnalyzeError("unknown", { cause: error });
  } finally {
    // Always reset the in-progress flag
    GLOBAL_API_CALL_IN_PROGRESS = false;
    console.log("Gemini API call completed at", new Date().toISOString());
    console.log("API call in-progress flag reset");
  }
}

// Simple utility function to potentially resize images if they're too large
// This is a placeholder - in a real app, you'd want a more sophisticated approach
// using libraries like react-native-image-manipulator or similar
function validateAndProcessImage(
  base64Data: string,
  mimeType: string
): { data: string; mimeType: string } {
  // Check if the image is too large for the API
  if (base64Data.length > 1000000) {
    // Over ~1MB
    console.log("Image is large, might need processing in a real app");
    // In a real app, you would resize/compress the image here
  }

  return { data: base64Data, mimeType };
}

// Export a function to reset all state - only use this in very specific situations!
export function resetApiState() {
  console.log("🔄 COMPLETE API STATE RESET requested");
  GLOBAL_API_CALL_MADE = false;
  GLOBAL_API_CALL_IN_PROGRESS = false;
  GLOBAL_API_RESULT = null;
  console.log("✅ API state completely reset");
  return true;
}
