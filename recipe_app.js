import { Command } from 'commander';
import axios from 'axios';
import dotenv from 'dotenv';
import retry from 'async-retry';

dotenv.config();

const program = new Command();

program
    .name('recipe-app')
    .description('Generate gourmet recipes using DeepSeek API')
    .option('--ingredients <list>', 'Comma-separated list of available ingredients')
    .option('--cuisine <type>', 'Preferred cuisine type')
    .option('--dietary <restrictions>', 'Dietary restrictions')
    .option('--max-time <minutes>', 'Maximum cooking time in minutes', parseInt)
    .option('--servings <number>', 'Number of servings', parseInt)
    .parse(process.argv);

const options = program.opts();

async function generateRecipes() {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey || !apiKey.startsWith('sk-')) {
    console.error('❌ Error: DEEPSEEK_API_KEY is missing or invalid in your .env file.');
    process.exit(1);
  }

  console.log('\n🤖 Requesting recipes from DeepSeek API...');
  console.log(`🛒 Ingredients: ${options.ingredients || 'Any'}`);
  console.log(`⚙️  Constraints: Cuisine: ${options.cuisine || 'Any'} | Dietary: ${options.dietary || 'None'} | Time: ${options.maxTime || 'Any'}m | Servings: ${options.servings || '2'}\n`);

  const prompt = `You are a Michelin-star chef. Create 3 authentic, detailed gourmet recipes based strictly on these criteria:
- Available Ingredients: ${options.ingredients || 'Any'}
- Cuisine: ${options.cuisine || 'Any'}
- Dietary Restrictions: ${options.dietary || 'None'}
- Max Cook Time: ${options.maxTime ? options.maxTime + ' minutes' : 'Any'}
- Servings: ${options.servings || '2'}

STRICT RULES:
1. Provide REAL, mouth-watering dish titles (e.g. "Pan-Seared Garlic Butter Chicken Breast").
2. Provide 4 to 6 detailed, step-by-step cooking instructions with exact techniques and heat levels.

You MUST return a JSON object with a key "recipes" containing an array of 3 objects.
Each object must have these exact keys: "title", "cook_time", "ingredients" (array of strings), and "instructions" (array of strings).`;

  try {
    const rawContent = await retry(
        async (bail) => {
          try {
            const res = await axios.post(
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
                  timeout: 30000
                }
            );

            return res.data?.choices?.[0]?.message?.content || '';
          } catch (err) {
            if (err.response && err.response.status >= 400 && err.response.status < 500) {
              bail(new Error(`DeepSeek API Error: ${err.response.status} ${err.response.statusText}`));
            }
            throw err;
          }
        },
        {
          retries: 2,
          onRetry: (err) => console.log(`Retry attempt due to: ${err.message}...`)
        }
    );

    const cleaned = rawContent.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    let recipes = [];
    if (parsed.recipes && Array.isArray(parsed.recipes)) {
      recipes = parsed.recipes;
    } else if (Array.isArray(parsed)) {
      recipes = parsed;
    } else if (parsed.title) {
      recipes = [parsed];
    }

    const userIngredients = options.ingredients
        ? options.ingredients.toLowerCase().split(',').map(i => i.trim())
        : [];

    recipes.forEach((recipe, index) => {
      console.log(`==================================================`);
      console.log(`📖 RECIPE ${index + 1}: ${recipe.title || 'Untitled'}`);
      console.log(`⏱️  Cook Time: ${recipe.cook_time || 'N/A'}`);
      console.log('\n🛒 Ingredients:');

      const ingredientsList = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

      ingredientsList.forEach(ing => {
        const ingText = typeof ing === 'object' ? (ing.text || ing.name) : ing;
        const isAvailable =
            userIngredients.length === 0 ||
            userIngredients.some(ui => ingText.toLowerCase().includes(ui));
        const tag = isAvailable ? '✅ [AVAILABLE]' : '❌ [MISSING FROM FRIDGE]';
        console.log(`  - ${tag} ${ingText}`);
      });

      console.log('\n👨‍🍳 Step-by-step Instructions:');
      const instructionsList = Array.isArray(recipe.instructions) ? recipe.instructions : [];
      instructionsList.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
      console.log(`==================================================\n`);
    });

  } catch (error) {
    console.error('❌ Error generating recipes:', error.message);
    process.exit(1);
  }
}

generateRecipes();