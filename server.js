import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', async (req, res) => {
    const { ingredients, cuisine, mealType, dietary, maxTime, servings } = req.body;
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey || !apiKey.startsWith('sk-')) {
        return res.status(400).json({
            success: false,
            error: 'DEEPSEEK_API_KEY відсутній або некоректний у файлі .env'
        });
    }

    // Промпт вимагає JSON-об'єкт із ключем "recipes", що ідеально підходить під формат DeepSeek
    const prompt = `You are a Michelin-star chef. Create exactly 3 authentic, mouth-watering, and highly detailed recipes based strictly on these criteria:
- Available Ingredients: ${ingredients || 'Any'}
- Preferred Cuisine: ${cuisine || 'Any'}
- Meal Type: ${mealType || 'Any'}
- Dietary Restrictions: ${dietary || 'None'}
- Max Cooking Time: ${maxTime || 45} minutes
- Servings: ${servings || 2}

STRICT RULES:
1. Provide REAL, specific dish titles (e.g. "Pan-Seared Garlic Butter Chicken with Roast Veggies"). NEVER use generic words or placeholders.
2. List all ingredients with exact measurements. Set "available": true for items provided by user, and "available": false for extra pantry items needed (e.g. olive oil, salt, garlic).
3. Provide 4 to 6 detailed, step-by-step cooking instructions with exact pan temperatures, searing times, and professional techniques.

You MUST return a JSON object containing a single key "recipes", which holds an array of 3 recipe objects.

JSON SCHEMA:
{
  "recipes": [
    {
      "title": "Exact Dish Name",
      "cook_time": "25 mins",
      "difficulty": "Easy|Medium|Hard",
      "ingredients": [
        { "text": "2 Chicken Breasts", "available": true },
        { "text": "1 tbsp Olive Oil", "available": false }
      ],
      "instructions": [
        "Step 1: Preheat a heavy skillet over medium-high heat with 1 tbsp olive oil...",
        "Step 2: Season chicken breasts with salt and pepper, then sear for 6 minutes..."
      ]
    }
  ]
}`;

    try {
        console.log('🤖 Sending request to DeepSeek API...');

        const response = await axios.post(
            'https://api.deepseek.com/chat/completions',
            {
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'You are an expert chef assistant outputting strictly valid JSON objects.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 45000
            }
        );

        const rawContent = response.data?.choices?.[0]?.message?.content || '';
        const cleanedText = rawContent.replace(/```json|```/g, '').trim();

        const parsed = JSON.parse(cleanedText);
        let recipes = [];

        if (parsed.recipes && Array.isArray(parsed.recipes)) {
            recipes = parsed.recipes;
        } else if (Array.isArray(parsed)) {
            recipes = parsed;
        } else if (parsed.title) {
            recipes = [parsed];
        }

        if (recipes.length > 0) {
            return res.json({ success: true, recipes });
        }

        return res.status(500).json({ success: false, error: 'DeepSeek повернув некоректну структуру.' });

    } catch (err) {
        console.error('DeepSeek Error:', err.response?.data || err.message);
        const errorDetails = err.response?.data?.error?.message || err.message;
        return res.status(500).json({ success: false, error: `Помилка DeepSeek API: ${errorDetails}` });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 DeepSeek Recipe Server running on http://localhost:${PORT}`);
});