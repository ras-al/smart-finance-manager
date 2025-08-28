// Service to interact with the Gemini API
const API_KEY = "AIzaSyCJAU0Prim6VUFvJzKsBsyLh7ulYCXkNs8"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

export const analyzeTransaction = async (description, amount) => {
    const prompt = `
        Analyze the following expense and return ONLY a valid JSON object. Do not include any other text or markdown formatting.
        Expense: "${description}" for amount ${amount}.
        
        Based on the description, provide the following:
        1.  "category": One of [Food, Travel, Shopping, Bills, Entertainment, Other].
        2.  "foodType": If category is Food, classify as one of [Junk, Healthy, Neutral]. Otherwise, null.
        3.  "estimatedCalories": A rough calorie estimate if it's Junk or Healthy food. Otherwise, 0.
        4.  "isImpulse": A boolean (true/false) suggesting if this is likely an impulse purchase (e.g., non-essential high-cost items like gadgets, luxury fashion, frequent small unnecessary purchases).
        5.  "suggestion": A short, actionable tip related to this expense for saving money or being healthier.

        Example for "McDonald's 250":
        {
            "category": "Food",
            "foodType": "Junk",
            "estimatedCalories": 500,
            "isImpulse": true,
            "suggestion": "Consider a home-cooked meal next time to save money and calories."
        }
        
        Example for "Nike Shoes 5000":
        {
            "category": "Shopping",
            "foodType": null,
            "estimatedCalories": 0,
            "isImpulse": true,
            "suggestion": "Did you need these shoes right now? Setting a 'wants' budget can help manage impulse buys."
        }

        Now, analyze this expense: "${description}" for ${amount}
    `;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        });

        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }

        const data = await response.json();
        const jsonString = data.candidates[0].content.parts[0].text;
        
        // Clean the string to ensure it's valid JSON
        const cleanedJsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(cleanedJsonString);
    } catch (error) {
        console.error("Error analyzing transaction:", error);
        // Return a default object on error to prevent app crash
        return {
            category: "Other",
            foodType: null,
            estimatedCalories: 0,
            isImpulse: false,
            suggestion: "Could not analyze transaction. Please categorize manually."
        };
    }
};
