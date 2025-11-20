import { Food, Recipe, Patient } from "@/context/AppContext";

export const mockFoods: Food[] = [
  {
    id: '1',
    name: 'Basmati Rice',
    category: 'grains',
    calories: 205,
    protein: 4.3,
    carbs: 45,
    fat: 0.4,
    fiber: 0.6,
    ayurvedicProperties: {
      rasa: ['sweet'],
      virya: 'cooling',
      vipaka: 'sweet',
      doshaEffect: {
        vata: 'decreases',
        pitta: 'decreases',
        kapha: 'increases'
      }
    },
    seasonal: ['spring', 'summer', 'monsoon', 'autumn', 'winter'],
    isVegetarian: true,
    isVegan: true
  },
  {
    id: '2',
    name: 'Ghee',
    category: 'dairy',
    calories: 112,
    protein: 0,
    carbs: 0,
    fat: 12.8,
    fiber: 0,
    ayurvedicProperties: {
      rasa: ['sweet'],
      virya: 'cooling',
      vipaka: 'sweet',
      doshaEffect: {
        vata: 'decreases',
        pitta: 'decreases',
        kapha: 'increases'
      }
    },
    seasonal: ['autumn', 'winter'],
    isVegetarian: true,
    isVegan: false
  },
  {
    id: '3',
    name: 'Turmeric',
    category: 'spices',
    calories: 24,
    protein: 0.9,
    carbs: 4.4,
    fat: 0.7,
    fiber: 1.4,
    ayurvedicProperties: {
      rasa: ['bitter', 'pungent'],
      virya: 'heating',
      vipaka: 'pungent',
      doshaEffect: {
        vata: 'decreases',
        pitta: 'neutral',
        kapha: 'decreases'
      }
    },
    seasonal: ['spring', 'summer', 'monsoon', 'autumn', 'winter'],
    isVegetarian: true,
    isVegan: true
  },
  {
    id: '4',
    name: 'Almonds',
    category: 'proteins',
    calories: 579,
    protein: 21.2,
    carbs: 21.6,
    fat: 49.9,
    fiber: 12.5,
    ayurvedicProperties: {
      rasa: ['sweet'],
      virya: 'heating',
      vipaka: 'sweet',
      doshaEffect: {
        vata: 'decreases',
        pitta: 'increases',
        kapha: 'increases'
      }
    },
    seasonal: ['autumn', 'winter'],
    isVegetarian: true,
    isVegan: true
  },
  {
    id: '5',
    name: 'Spinach',
    category: 'vegetables',
    calories: 23,
    protein: 2.9,
    carbs: 3.6,
    fat: 0.4,
    fiber: 2.2,
    ayurvedicProperties: {
      rasa: ['bitter', 'astringent'],
      virya: 'cooling',
      vipaka: 'pungent',
      doshaEffect: {
        vata: 'increases',
        pitta: 'decreases',
        kapha: 'decreases'
      }
    },
    seasonal: ['winter', 'spring'],
    isVegetarian: true,
    isVegan: true
  }
];

export const mockRecipes: Recipe[] = [
  {
    id: '1',
    name: 'Golden Milk Turmeric Latte',
    ingredients: [
      { foodId: '2', quantity: 1, unit: 'tsp' }, // Ghee
      { foodId: '3', quantity: 0.5, unit: 'tsp' } // Turmeric
    ],
    instructions: [
      'Heat 1 cup of milk in a saucepan',
      'Add turmeric and ghee',
      'Simmer for 5 minutes',
      'Strain and serve warm'
    ],
    servings: 1,
    prepTime: 2,
    cookTime: 8,
    totalNutrition: {
      calories: 136,
      protein: 0.9,
      carbs: 4.4,
      fat: 13.5,
      fiber: 1.4
    },
    ayurvedicBalance: {
      vata: 40,
      pitta: 30,
      kapha: 30
    },
    tags: ['warming', 'immunity-boosting', 'anti-inflammatory']
  },
  {
    id: '2',
    name: 'Ayurvedic Spinach Rice Bowl',
    ingredients: [
      { foodId: '1', quantity: 150, unit: 'g' }, // Basmati Rice
      { foodId: '5', quantity: 100, unit: 'g' }, // Spinach
      { foodId: '2', quantity: 1, unit: 'tsp' }, // Ghee
      { foodId: '3', quantity: 0.25, unit: 'tsp' } // Turmeric
    ],
    instructions: [
      'Cook basmati rice with turmeric',
      'Sauté spinach with ghee',
      'Mix rice and spinach',
      'Serve hot with additional ghee if desired'
    ],
    servings: 2,
    prepTime: 10,
    cookTime: 25,
    totalNutrition: {
      calories: 351,
      protein: 8.1,
      carbs: 53,
      fat: 14.1,
      fiber: 4.2
    },
    ayurvedicBalance: {
      vata: 30,
      pitta: 35,
      kapha: 35
    },
    tags: ['balanced', 'nourishing', 'easy-digest']
  }
];

export const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'Priya Sharma',
    age: 32,
    gender: 'female',
    weight: 58,
    height: 165,
    bmi: 21.3,
    primaryDosha: 'vata',
    secondaryDosha: 'pitta',
    conditions: ['Anxiety', 'Insomnia', 'Digestive Issues'],
    allergies: ['Nuts', 'Shellfish'],
    adherenceScore: 85,
    lastLogDate: '2024-01-15'
  },
  {
    id: '2',
    name: 'Rajesh Kumar',
    age: 45,
    gender: 'male',
    weight: 78,
    height: 175,
    bmi: 25.4,
    primaryDosha: 'kapha',
    conditions: ['Type 2 Diabetes', 'High Blood Pressure', 'High Cholesterol'],
    allergies: [],
    adherenceScore: 72,
    lastLogDate: '2024-01-14'
  },
  {
    id: '3',
    name: 'Anita Patel',
    age: 28,
    gender: 'female',
    weight: 52,
    height: 160,
    bmi: 20.3,
    primaryDosha: 'pitta',
    conditions: ['Acidity', 'Skin Issues', 'Stress'],
    allergies: ['Dairy'],
    adherenceScore: 92,
    lastLogDate: '2024-01-15'
  },
  {
    id: '4',
    name: 'Vikram Singh',
    age: 39,
    gender: 'male',
    weight: 85,
    height: 180,
    bmi: 26.2,
    primaryDosha: 'kapha',
    secondaryDosha: 'vata',
    conditions: ['Weight Management', 'Joint Pain', 'Low Energy'],
    allergies: ['Gluten'],
    adherenceScore: 68,
    lastLogDate: '2024-01-13'
  },
  {
    id: '5',
    name: 'Meera Reddy',
    age: 26,
    gender: 'female',
    weight: 48,
    height: 158,
    bmi: 19.2,
    primaryDosha: 'vata',
    conditions: ['Anxiety', 'Irregular Periods', 'Low Appetite'],
    allergies: [],
    adherenceScore: 78,
    lastLogDate: '2024-01-15'
  }
];

export const ayurvedicTips = [
  {
    title: "Eat According to Your Dosha",
    description: "Vata types should favor warm, cooked, and oily foods. Pitta types benefit from cool, fresh, and sweet foods. Kapha types do well with light, dry, and spicy foods.",
    category: 'dosha' as const,
    dosha: undefined,
    timeOfDay: undefined
  },
  {
    title: "Morning Warm Water",
    description: "Start your day with a glass of warm water to stimulate digestion and flush toxins from your system. Add lemon for extra detoxification benefits.",
    category: 'lifestyle' as const,
    dosha: undefined,
    timeOfDay: 'morning' as const
  },
  {
    title: "Seasonal Eating",
    description: "Eat foods that are in season and grown locally. Summer calls for cooling foods like cucumbers and melons, while winter requires warming spices and root vegetables.",
    category: 'seasonal' as const,
    dosha: undefined,
    timeOfDay: undefined
  },
  {
    title: "Mindful Eating",
    description: "Eat in a calm environment without distractions. Chew your food thoroughly and appreciate the flavors, textures, and nourishment you're receiving.",
    category: 'lifestyle' as const,
    dosha: undefined,
    timeOfDay: undefined
  },
  {
    title: "Vata Balancing Foods",
    description: "Warm, moist, and grounding foods like cooked grains, root vegetables, and healthy fats help balance excess Vata. Avoid cold, dry, and raw foods.",
    category: 'nutrition' as const,
    dosha: 'vata' as const,
    timeOfDay: undefined
  },
  {
    title: "Pitta Cooling Diet",
    description: "Cool, sweet, and bitter foods help balance Pitta. Include plenty of fresh fruits, leafy greens, and cooling spices like coriander and fennel.",
    category: 'nutrition' as const,
    dosha: 'pitta' as const,
    timeOfDay: undefined
  },
  {
    title: "Kapha Stimulating Foods",
    description: "Light, dry, and spicy foods help balance Kapha. Include plenty of vegetables, legumes, and warming spices like ginger, black pepper, and cinnamon.",
    category: 'nutrition' as const,
    dosha: 'kapha' as const,
    timeOfDay: undefined
  }
];