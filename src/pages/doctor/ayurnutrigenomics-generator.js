// ayurnutrigenomics-generator.js
// Rule-based diet plan generation using Ayurvedic principles and patient assessment data

class AyurnutrigenomicsDietGenerator {
    constructor() {
      // Food database categorized by Ayurvedic properties
      this.foodDatabase = {
        vata: {
          favorable: [
            { name: "Warm Rice Porridge", category: "grains", calories: 150, protein: 3, fat: 1, carbs: 32 },
            { name: "Cooked Quinoa", category: "grains", calories: 160, protein: 6, fat: 2.5, carbs: 27 },
            { name: "Sweet Potato", category: "vegetables", calories: 86, protein: 2, fat: 0.1, carbs: 20 },
            { name: "Carrots", category: "vegetables", calories: 25, protein: 0.5, fat: 0.1, carbs: 6 },
            { name: "Beets", category: "vegetables", calories: 44, protein: 1.6, fat: 0.2, carbs: 10 },
            { name: "Avocado", category: "fruits", calories: 234, protein: 3, fat: 21, carbs: 12 },
            { name: "Bananas", category: "fruits", calories: 96, protein: 1.2, fat: 0.3, carbs: 25 },
            { name: "Dates", category: "fruits", calories: 282, protein: 2.5, fat: 0.4, carbs: 75 },
            { name: "Almonds", category: "nuts", calories: 164, protein: 6, fat: 14, carbs: 6 },
            { name: "Walnuts", category: "nuts", calories: 185, protein: 4.3, fat: 18.5, carbs: 3.9 },
            { name: "Warm Milk", category: "dairy", calories: 150, protein: 8, fat: 8, carbs: 12 },
            { name: "Ghee", category: "fats", calories: 112, protein: 0, fat: 12.8, carbs: 0 },
            { name: "Sesame Oil", category: "fats", calories: 120, protein: 0, fat: 14, carbs: 0 },
            { name: "Mung Dal", category: "legumes", calories: 105, protein: 7, fat: 0.4, carbs: 19 },
            { name: "Ginger Tea", category: "beverages", calories: 4, protein: 0.1, fat: 0, carbs: 0.8 },
          ],
          avoid: [
            { name: "Raw Salads", reason: "Too cold and dry for Vata" },
            { name: "Carbonated Drinks", reason: "Increases Vata air element" },
            { name: "Dried Fruits", reason: "Too dry and astringent" },
            { name: "Excessive Raw Foods", reason: "Difficult to digest for Vata" }
          ]
        },
        pitta: {
          favorable: [
            { name: "Basmati Rice", category: "grains", calories: 130, protein: 2.7, fat: 0.3, carbs: 28 },
            { name: "Barley", category: "grains", calories: 123, protein: 2.3, fat: 0.4, carbs: 28 },
            { name: "Cucumber", category: "vegetables", calories: 12, protein: 0.6, fat: 0.1, carbs: 2.2 },
            { name: "Leafy Greens", category: "vegetables", calories: 15, protein: 1.5, fat: 0.1, carbs: 2.3 },
            { name: "Zucchini", category: "vegetables", calories: 20, protein: 1.5, fat: 0.2, carbs: 3.9 },
            { name: "Sweet Apples", category: "fruits", calories: 52, protein: 0.3, fat: 0.2, carbs: 14 },
            { name: "Sweet Pears", category: "fruits", calories: 57, protein: 0.4, fat: 0.1, carbs: 15 },
            { name: "Coconut", category: "fruits", calories: 354, protein: 3.3, fat: 33, carbs: 15 },
            { name: "Sunflower Seeds", category: "nuts", calories: 165, protein: 5.8, fat: 14, carbs: 6.8 },
            { name: "Cool Milk", category: "dairy", calories: 150, protein: 8, fat: 8, carbs: 12 },
            { name: "Coconut Oil", category: "fats", calories: 117, protein: 0, fat: 13.6, carbs: 0 },
            { name: "Chickpeas", category: "legumes", calories: 164, protein: 8.9, fat: 2.6, carbs: 27 },
            { name: "Mint Tea", category: "beverages", calories: 2, protein: 0.1, fat: 0, carbs: 0.5 },
          ],
          avoid: [
            { name: "Spicy Foods", reason: "Increases Pitta heat" },
            { name: "Citrus Fruits", reason: "Too heating and acidic" },
            { name: "Fried Foods", reason: "Increases Pitta fire element" },
            { name: "Alcohol", reason: "Heating and inflammatory" }
          ]
        },
        kapha: {
          favorable: [
            { name: "Millet", category: "grains", calories: 119, protein: 3.5, fat: 1.2, carbs: 23 },
            { name: "Buckwheat", category: "grains", calories: 155, protein: 5.7, fat: 1.6, carbs: 32 },
            { name: "Broccoli", category: "vegetables", calories: 25, protein: 2.6, fat: 0.3, carbs: 5 },
            { name: "Cauliflower", category: "vegetables", calories: 23, protein: 2.3, fat: 0.3, carbs: 4.6 },
            { name: "Spinach", category: "vegetables", calories: 7, protein: 0.9, fat: 0.1, carbs: 1.1 },
            { name: "Apples", category: "fruits", calories: 52, protein: 0.3, fat: 0.2, carbs: 14 },
            { name: "Berries", category: "fruits", calories: 32, protein: 0.7, fat: 0.3, carbs: 7.7 },
            { name: "Pomegranate", category: "fruits", calories: 134, protein: 2.7, fat: 1.9, carbs: 30 },
            { name: "Pumpkin Seeds", category: "nuts", calories: 151, protein: 7, fat: 13, carbs: 5 },
            { name: "Low-fat Yogurt", category: "dairy", calories: 59, protein: 10, fat: 0.4, carbs: 3.6 },
            { name: "Mustard Oil", category: "fats", calories: 124, protein: 0, fat: 14, carbs: 0 },
            { name: "Black Beans", category: "legumes", calories: 132, protein: 8.9, fat: 0.5, carbs: 24 },
            { name: "Ginger Tea", category: "beverages", calories: 4, protein: 0.1, fat: 0, carbs: 0.8 },
          ],
          avoid: [
            { name: "Heavy Foods", reason: "Increases Kapha sluggishness" },
            { name: "Dairy Products", reason: "Too heavy and mucus-forming" },
            { name: "Sweet Foods", reason: "Increases Kapha earth element" },
            { name: "Cold Foods", reason: "Reduces digestive fire" }
          ]
        }
      };
  
      // Spice recommendations by dosha
      this.spiceRecommendations = {
        vata: ["ginger", "cinnamon", "cardamom", "cumin", "fennel", "asafoetida"],
        pitta: ["coriander", "fennel", "mint", "coconut", "rose", "cardamom"],
        kapha: ["ginger", "black pepper", "turmeric", "mustard seeds", "fenugreek", "cloves"]
      };
  
      // Cooking methods by dosha
      this.cookingMethods = {
        vata: ["steaming", "sautéing with ghee", "slow cooking", "warm preparations"],
        pitta: ["steaming", "light sautéing", "cooling preparations", "raw when appropriate"],
        kapha: ["roasting", "grilling", "dry sautéing", "light cooking"]
      };
    }
  
    // Main function to generate diet plan
    generateDietPlan(patientData, days = 7) {
      try {
        console.log("Generating diet plan for patient:", patientData.name);
  
        // Step 1: Determine primary dosha
        const primaryDosha = this.determinePrimaryDosha(patientData);
        console.log("Primary dosha determined:", primaryDosha);
  
        // Step 2: Analyze health conditions and goals
        const healthAnalysis = this.analyzeHealthProfile(patientData);
        console.log("Health analysis:", healthAnalysis);
  
        // Step 3: Generate meal plan
        const mealPlan = this.generateMealPlan(primaryDosha, healthAnalysis, days);
        console.log("Meal plan generated for", days, "days");
  
        // Step 4: Add specific recommendations
        const recommendations = this.generateRecommendations(primaryDosha, healthAnalysis, patientData);
  
        return {
          success: true,
          patientName: patientData.name,
          primaryDosha: primaryDosha,
          healthAnalysis: healthAnalysis,
          mealPlan: mealPlan,
          recommendations: recommendations,
          generatedAt: new Date().toISOString()
        };
  
      } catch (error) {
        console.error("Error generating diet plan:", error);
        return {
          success: false,
          error: error.message
        };
      }
    }
  
    // Determine primary dosha based on questionnaire responses
    determinePrimaryDosha(data) {
      const doshaScores = { vata: 0, pitta: 0, kapha: 0 };
  
      // Body frame analysis
      if (data.bodyFrame === 'thin') doshaScores.vata += 3;
      else if (data.bodyFrame === 'medium') doshaScores.pitta += 3;
      else if (data.bodyFrame === 'large') doshaScores.kapha += 3;
  
      // Skin type analysis
      if (data.skinType === 'dry') doshaScores.vata += 2;
      else if (data.skinType === 'oily') doshaScores.pitta += 2;
      else if (data.skinType === 'normal') doshaScores.kapha += 2;
  
      // Hair type analysis
      if (data.hairType === 'dry') doshaScores.vata += 2;
      else if (data.hairType === 'fine') doshaScores.pitta += 2;
      else if (data.hairType === 'thick') doshaScores.kapha += 2;
  
      // Appetite pattern analysis
      if (data.appetitePattern === 'variable') doshaScores.vata += 2;
      else if (data.appetitePattern === 'strong') doshaScores.pitta += 2;
      else if (data.appetitePattern === 'slow') doshaScores.kapha += 2;
  
      // Physical activity analysis
      if (data.physicalActivity === 'sedentary') doshaScores.kapha += 1;
      else if (data.physicalActivity === 'active') doshaScores.pitta += 1;
  
      // Energy levels analysis
      if (data.energyLevels <= 2) doshaScores.vata += 1;
      else if (data.energyLevels >= 4) doshaScores.pitta += 1;
  
      // Personality traits analysis
      if (data.personalityTraits) {
        if (data.personalityTraits.includes('creative') || data.personalityTraits.includes('anxious')) {
          doshaScores.vata += 1;
        }
        if (data.personalityTraits.includes('ambitious') || data.personalityTraits.includes('focused')) {
          doshaScores.pitta += 1;
        }
        if (data.personalityTraits.includes('calm') || data.personalityTraits.includes('steady')) {
          doshaScores.kapha += 1;
        }
      }
  
      // Weather preference analysis
      if (data.weatherPreference === 'warm') doshaScores.vata += 1;
      else if (data.weatherPreference === 'cool') doshaScores.pitta += 1;
  
      // Digestive issues analysis
      if (data.digestionIssues) {
        if (data.digestionIssues.includes('gas') || data.digestionIssues.includes('constipation')) {
          doshaScores.vata += 2;
        }
        if (data.digestionIssues.includes('acidity')) {
          doshaScores.pitta += 2;
        }
        if (data.digestionIssues.includes('bloating')) {
          doshaScores.kapha += 1;
        }
      }
  
      // Return the dosha with highest score
      return Object.keys(doshaScores).reduce((a, b) => 
        doshaScores[a] > doshaScores[b] ? a : b
      );
    }
  
    // Analyze health profile for specific dietary needs
    analyzeHealthProfile(data) {
      const analysis = {
        primaryConcerns: [],
        dietaryRestrictions: [],
        nutritionalFocus: [],
        specialConsiderations: []
      };
  
      // Current conditions analysis
      if (data.currentConditions) {
        if (data.currentConditions.includes('diabetes')) {
          analysis.primaryConcerns.push('blood sugar management');
          analysis.nutritionalFocus.push('low glycemic foods');
          analysis.specialConsiderations.push('avoid refined sugars');
        }
        if (data.currentConditions.includes('hypertension')) {
          analysis.primaryConcerns.push('blood pressure management');
          analysis.nutritionalFocus.push('low sodium foods');
          analysis.specialConsiderations.push('increase potassium-rich foods');
        }
        if (data.currentConditions.includes('arthritis')) {
          analysis.primaryConcerns.push('inflammation reduction');
          analysis.nutritionalFocus.push('anti-inflammatory foods');
        }
        if (data.currentConditions.includes('pcos')) {
          analysis.primaryConcerns.push('hormonal balance');
          analysis.nutritionalFocus.push('hormone-balancing foods');
        }
      }
  
      // Health goals analysis
      if (data.healthGoals) {
        if (data.healthGoals.includes('weight-loss')) {
          analysis.nutritionalFocus.push('calorie-controlled portions');
          analysis.specialConsiderations.push('increase fiber and protein');
        }
        if (data.healthGoals.includes('digestive-health')) {
          analysis.nutritionalFocus.push('digestive-friendly foods');
          analysis.specialConsiderations.push('avoid raw and cold foods');
        }
        if (data.healthGoals.includes('energy-boost')) {
          analysis.nutritionalFocus.push('energy-sustaining foods');
          analysis.specialConsiderations.push('balanced macronutrients');
        }
        if (data.healthGoals.includes('immunity')) {
          analysis.nutritionalFocus.push('immune-boosting foods');
          analysis.specialConsiderations.push('include vitamin C and antioxidants');
        }
      }
  
      // Digestive issues consideration
      if (data.digestionIssues && data.digestionIssues.length > 0 && !data.digestionIssues.includes('none')) {
        analysis.primaryConcerns.push('digestive health');
        analysis.specialConsiderations.push('easily digestible foods');
      }
  
      // Dietary preferences
      if (data.dietaryPreferences) {
        analysis.dietaryRestrictions.push(data.dietaryPreferences);
      }
  
      return analysis;
    }
  
    // Generate complete meal plan
    generateMealPlan(dosha, healthAnalysis, days) {
      const mealPlan = {};
  
      for (let day = 1; day <= days; day++) {
        mealPlan[`day${day}`] = {
          breakfast: this.generateMeal(dosha, 'breakfast', healthAnalysis),
          lunch: this.generateMeal(dosha, 'lunch', healthAnalysis),
          dinner: this.generateMeal(dosha, 'dinner', healthAnalysis),
          snack: this.generateMeal(dosha, 'snack', healthAnalysis)
        };
      }
  
      return mealPlan;
    }
  
    // Generate individual meal
    generateMeal(dosha, mealType, healthAnalysis) {
      const favorableFoods = this.foodDatabase[dosha].favorable;
      const meal = {
        items: [],
        cookingMethod: this.getRandomItem(this.cookingMethods[dosha]),
        spices: this.getRandomItems(this.spiceRecommendations[dosha], 2),
        totalCalories: 0,
        totalProtein: 0,
        totalFat: 0,
        totalCarbs: 0
      };
  
      // Define meal composition based on type
      let targetCalories;
      switch (mealType) {
        case 'breakfast': targetCalories = 300; break;
        case 'lunch': targetCalories = 400; break;
        case 'dinner': targetCalories = 350; break;
        case 'snack': targetCalories = 150; break;
        default: targetCalories = 300;
      }
  
      // Select appropriate foods for meal
      let remainingCalories = targetCalories;
      const selectedCategories = new Set();
  
      // Ensure variety in food categories
      const requiredCategories = this.getMealCategories(mealType);
      
      for (const category of requiredCategories) {
        const categoryFoods = favorableFoods.filter(food => food.category === category);
        if (categoryFoods.length > 0 && remainingCalories > 50) {
          const selectedFood = this.getRandomItem(categoryFoods);
          
          // Adjust portion based on remaining calories
          let portion = Math.min(1, remainingCalories / selectedFood.calories);
          if (portion < 0.3) portion = 0.5; // Minimum portion
          
          const foodItem = {
            ...selectedFood,
            portion: portion,
            calories: Math.round(selectedFood.calories * portion),
            protein: Math.round(selectedFood.protein * portion * 10) / 10,
            fat: Math.round(selectedFood.fat * portion * 10) / 10,
            carbs: Math.round(selectedFood.carbs * portion * 10) / 10
          };
  
          meal.items.push(foodItem);
          remainingCalories -= foodItem.calories;
          selectedCategories.add(category);
  
          // Update totals
          meal.totalCalories += foodItem.calories;
          meal.totalProtein += foodItem.protein;
          meal.totalFat += foodItem.fat;
          meal.totalCarbs += foodItem.carbs;
        }
      }
  
      // Add health-specific modifications
      this.applyHealthModifications(meal, healthAnalysis, dosha);
  
      return meal;
    }
  
    // Get required food categories for each meal type
    getMealCategories(mealType) {
      switch (mealType) {
        case 'breakfast':
          return ['grains', 'fruits', 'dairy', 'nuts'];
        case 'lunch':
          return ['grains', 'vegetables', 'legumes', 'fats'];
        case 'dinner':
          return ['grains', 'vegetables', 'legumes'];
        case 'snack':
          return ['fruits', 'nuts'];
        default:
          return ['grains', 'vegetables'];
      }
    }
  
    // Apply health-specific modifications to meals
    applyHealthModifications(meal, healthAnalysis, dosha) {
      // For diabetes - reduce high glycemic foods
      if (healthAnalysis.primaryConcerns.includes('blood sugar management')) {
        meal.specialNote = "Low glycemic meal suitable for diabetes management";
      }
  
      // For weight loss - reduce calories
      if (healthAnalysis.nutritionalFocus.includes('calorie-controlled portions')) {
        meal.totalCalories = Math.round(meal.totalCalories * 0.85);
        meal.specialNote = "Calorie-controlled portion for weight management";
      }
  
      // For digestive issues - suggest cooking methods
      if (healthAnalysis.primaryConcerns.includes('digestive health')) {
        meal.cookingMethod = "gentle steaming or light sautéing";
        meal.specialNote = "Easily digestible preparation for sensitive digestion";
      }
    }
  
    // Generate comprehensive recommendations
    generateRecommendations(dosha, healthAnalysis, patientData) {
      const recommendations = {
        dailyRoutine: this.getDailyRoutineRecommendations(dosha, patientData),
        foodGuidelines: this.getFoodGuidelines(dosha, healthAnalysis),
        lifestyle: this.getLifestyleRecommendations(dosha, patientData),
        avoidFoods: this.foodDatabase[dosha].avoid,
        spiceRecommendations: this.spiceRecommendations[dosha],
        cookingTips: this.getCookingTips(dosha),
        seasonalAdjustments: this.getSeasonalRecommendations(dosha)
      };
  
      return recommendations;
    }
  
    // Get daily routine recommendations based on dosha
    getDailyRoutineRecommendations(dosha, patientData) {
      const baseRecommendations = {
        vata: [
          "Wake up between 6-7 AM for grounding",
          "Eat meals at regular times",
          "Include warm, cooked foods",
          "Practice calming activities like yoga or meditation",
          "Sleep by 10 PM for adequate rest"
        ],
        pitta: [
          "Wake up early around 5:30-6:30 AM",
          "Avoid skipping meals, especially lunch",
          "Eat cooling foods during hot weather",
          "Engage in moderate exercise, avoid overheating",
          "Sleep between 10-11 PM"
        ],
        kapha: [
          "Wake up early around 5:30-6 AM",
          "Light breakfast, substantial lunch",
          "Include stimulating spices and herbs",
          "Engage in vigorous exercise regularly",
          "Sleep by 10 PM, avoid daytime naps"
        ]
      };
  
      return baseRecommendations[dosha];
    }
  
    // Get food guidelines based on dosha and health analysis
    getFoodGuidelines(dosha, healthAnalysis) {
      const guidelines = [];
  
      // Base dosha guidelines
      switch (dosha) {
        case 'vata':
          guidelines.push("Favor warm, moist, and grounding foods");
          guidelines.push("Include healthy fats like ghee and nuts");
          guidelines.push("Avoid raw, cold, and dry foods");
          break;
        case 'pitta':
          guidelines.push("Favor cool, sweet, and bitter tastes");
          guidelines.push("Include plenty of fresh vegetables and fruits");
          guidelines.push("Avoid spicy, sour, and fried foods");
          break;
        case 'kapha':
          guidelines.push("Favor light, warm, and spicy foods");
          guidelines.push("Include plenty of vegetables and legumes");
          guidelines.push("Avoid heavy, oily, and sweet foods");
          break;
      }
  
      // Add health-specific guidelines
      if (healthAnalysis.primaryConcerns.includes('blood sugar management')) {
        guidelines.push("Choose complex carbohydrates over simple sugars");
        guidelines.push("Include protein with each meal for stable blood sugar");
      }
  
      if (healthAnalysis.primaryConcerns.includes('inflammation reduction')) {
        guidelines.push("Include anti-inflammatory spices like turmeric");
        guidelines.push("Add omega-3 rich foods like walnuts and flax seeds");
      }
  
      return guidelines;
    }
  
    // Get lifestyle recommendations
    getLifestyleRecommendations(dosha, patientData) {
      const recommendations = [];
  
      // Exercise recommendations based on dosha
      switch (dosha) {
        case 'vata':
          recommendations.push("Gentle, grounding exercises like yoga or walking");
          recommendations.push("Avoid excessive or irregular exercise");
          break;
        case 'pitta':
          recommendations.push("Moderate exercise, avoid overheating");
          recommendations.push("Swimming and yoga are excellent choices");
          break;
        case 'kapha':
          recommendations.push("Vigorous, stimulating exercise regularly");
          recommendations.push("Running, cycling, or energetic yoga");
          break;
      }
  
      // Stress management based on current stress levels
      if (patientData.stressLevels >= 4) {
        recommendations.push("Practice daily meditation or pranayama");
        recommendations.push("Include stress-reducing herbs like ashwagandha");
      }
  
      // Sleep recommendations based on sleep duration
      if (patientData.sleepDuration === '<6h') {
        recommendations.push("Prioritize 7-8 hours of quality sleep");
        recommendations.push("Create a calming bedtime routine");
      }
  
      return recommendations;
    }
  
    // Get cooking tips based on dosha
    getCookingTips(dosha) {
      return {
        vata: [
          "Use warming spices like ginger and cinnamon",
          "Cook with ghee or sesame oil",
          "Prefer warm, moist cooking methods",
          "Avoid raw foods, especially in cold weather"
        ],
        pitta: [
          "Use cooling herbs like mint and coriander",
          "Cook with coconut oil or ghee",
          "Avoid excessive heat in cooking",
          "Include some raw foods when weather permits"
        ],
        kapha: [
          "Use heating spices like ginger and black pepper",
          "Use minimal oil, prefer mustard or sunflower oil",
          "Use dry cooking methods like roasting",
          "Avoid heavy, oily preparations"
        ]
      }[dosha];
    }
  
    // Get seasonal recommendations
    getSeasonalRecommendations(dosha) {
      return {
        vata: {
          winter: "Increase warm, oily foods; reduce cold, dry foods",
          summer: "Include cooling foods but maintain warmth in preparation",
          monsoon: "Focus on easily digestible, warm foods"
        },
        pitta: {
          winter: "Can include slightly warming foods in moderation",
          summer: "Emphasize cooling foods and avoid heating spices",
          monsoon: "Include digestive spices to counter dampness"
        },
        kapha: {
          winter: "Increase heating spices and reduce heavy foods",
          summer: "Continue with light foods, can include some cooling items",
          monsoon: "Emphasize warm, dry foods to counter dampness"
        }
      }[dosha];
    }
  
    // Utility functions
    getRandomItem(array) {
      return array[Math.floor(Math.random() * array.length)];
    }
  
    getRandomItems(array, count) {
      const shuffled = array.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    }
  }
  
  // Export the generator class
  export default AyurnutrigenomicsDietGenerator;
  
  // Example usage function
  export const generatePatientDietPlan = (patientAssessmentData, days = 7) => {
    const generator = new AyurnutrigenomicsDietGenerator();
    return generator.generateDietPlan(patientAssessmentData, days);
  };
  
  // Example function to format the plan for display
  export const formatDietPlanForDisplay = (dietPlan) => {
    if (!dietPlan.success) {
      return {
        error: dietPlan.error,
        message: "Failed to generate diet plan"
      };
    }
  
    const formattedPlan = {
      patientInfo: {
        name: dietPlan.patientName,
        primaryDosha: dietPlan.primaryDosha.toUpperCase(),
        healthFocus: dietPlan.healthAnalysis.primaryConcerns
      },
      weeklyPlan: {},
      recommendations: dietPlan.recommendations,
      summary: {
        totalDays: Object.keys(dietPlan.mealPlan).length,
        averageCaloriesPerDay: 0,
        keyFoods: []
      }
    };
  
    // Format daily meals
    Object.keys(dietPlan.mealPlan).forEach(day => {
      const dayNum = day.replace('day', '');
      const meals = dietPlan.mealPlan[day];
      
      formattedPlan.weeklyPlan[`Day ${dayNum}`] = {
        breakfast: {
          items: meals.breakfast.items.map(item => `${item.name} (${item.portion.toFixed(1)} portion)`),
          calories: meals.breakfast.totalCalories,
          cookingMethod: meals.breakfast.cookingMethod,
          spices: meals.breakfast.spices
        },
        lunch: {
          items: meals.lunch.items.map(item => `${item.name} (${item.portion.toFixed(1)} portion)`),
          calories: meals.lunch.totalCalories,
          cookingMethod: meals.lunch.cookingMethod,
          spices: meals.lunch.spices
        },
        dinner: {
          items: meals.dinner.items.map(item => `${item.name} (${item.portion.toFixed(1)} portion)`),
          calories: meals.dinner.totalCalories,
          cookingMethod: meals.dinner.cookingMethod,
          spices: meals.dinner.spices
        },
        snack: {
          items: meals.snack.items.map(item => `${item.name} (${item.portion.toFixed(1)} portion)`),
          calories: meals.snack.totalCalories
        }
      };
    });
  
    return formattedPlan;
  };