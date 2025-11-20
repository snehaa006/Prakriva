import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Save, 
  Sparkles,
  Sun,
  Utensils,
  Moon,
  Coffee
} from "lucide-react";
import { DoshaBalanceChart } from "@/components/charts/DoshaBalanceChart";

interface FoodItem {
  id: string;
  name: string;
  category: string;
  calories: number;
  doshaEffects: {
    vata: number;
    pitta: number;
    kapha: number;
  };
  rasa: string[];
  tags: string[];
}

interface MealSlot {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: FoodItem[];
  targetCalories: number;
}

// Mock food database
const mockFoods: FoodItem[] = [
  {
    id: '1',
    name: 'Oatmeal with Almonds',
    category: 'Grains',
    calories: 320,
    doshaEffects: { vata: -2, pitta: 0, kapha: 1 },
    rasa: ['sweet'],
    tags: ['warming', 'grounding', 'protein-rich']
  },
  {
    id: '2',
    name: 'Quinoa Bowl',
    category: 'Grains',
    calories: 450,
    doshaEffects: { vata: -1, pitta: -1, kapha: 0 },
    rasa: ['sweet', 'astringent'],
    tags: ['cooling', 'complete-protein', 'gluten-free']
  },
  {
    id: '3',
    name: 'Green Leafy Salad',
    category: 'Vegetables',
    calories: 120,
    doshaEffects: { vata: 1, pitta: -2, kapha: -1 },
    rasa: ['bitter', 'astringent'],
    tags: ['cooling', 'detoxifying', 'light']
  },
  {
    id: '4',
    name: 'Ginger Tea',
    category: 'Beverages',
    calories: 5,
    doshaEffects: { vata: -1, pitta: 1, kapha: -2 },
    rasa: ['pungent'],
    tags: ['warming', 'digestive', 'stimulating']
  },
  {
    id: '5',
    name: 'Coconut Rice',
    category: 'Grains',
    calories: 380,
    doshaEffects: { vata: -2, pitta: -1, kapha: 2 },
    rasa: ['sweet'],
    tags: ['cooling', 'nourishing', 'heavy']
  }
];

export const DietChartBuilder = () => {
  const [meals, setMeals] = useState<MealSlot[]>([
    { id: 'breakfast', type: 'breakfast', foods: [], targetCalories: 400 },
    { id: 'lunch', type: 'lunch', foods: [], targetCalories: 600 },
    { id: 'snack', type: 'snack', foods: [], targetCalories: 200 },
    { id: 'dinner', type: 'dinner', foods: [], targetCalories: 500 },
  ]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFood, setActiveFood] = useState<FoodItem | null>(null);

  const filteredFoods = mockFoods.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    food.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    food.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const calculateDoshaBalance = () => {
    let totalVata = 0, totalPitta = 0, totalKapha = 0;
    let totalItems = 0;

    meals.forEach(meal => {
      meal.foods.forEach(food => {
        totalVata += food.doshaEffects.vata;
        totalPitta += food.doshaEffects.pitta;
        totalKapha += food.doshaEffects.kapha;
        totalItems++;
      });
    });

    if (totalItems === 0) return { vata: 33, pitta: 33, kapha: 34 };

    // Normalize to percentages
    const sum = Math.abs(totalVata) + Math.abs(totalPitta) + Math.abs(totalKapha);
    if (sum === 0) return { vata: 33, pitta: 33, kapha: 34 };

    return {
      vata: Math.round((Math.abs(totalVata) / sum) * 100),
      pitta: Math.round((Math.abs(totalPitta) / sum) * 100),
      kapha: Math.round((Math.abs(totalKapha) / sum) * 100),
    };
  };

  const getMealIcon = (type: string) => {
    switch (type) {
      case 'breakfast': return Sun;
      case 'lunch': return Utensils;
      case 'snack': return Coffee;
      case 'dinner': return Moon;
      default: return Utensils;
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const food = mockFoods.find(f => f.id === active.id);
    setActiveFood(food || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveFood(null);

    if (!over) return;

    const foodId = active.id as string;
    const mealId = over.id as string;
    const food = mockFoods.find(f => f.id === foodId);

    if (!food) return;

    setMeals(prev => prev.map(meal => {
      if (meal.id === mealId) {
        // Check if food is already in this meal
        const existingFood = meal.foods.find(f => f.id === foodId);
        if (existingFood) return meal;
        
        return {
          ...meal,
          foods: [...meal.foods, food]
        };
      }
      return meal;
    }));
  };

  const removeFoodFromMeal = (mealId: string, foodId: string) => {
    setMeals(prev => prev.map(meal => {
      if (meal.id === mealId) {
        return {
          ...meal,
          foods: meal.foods.filter(f => f.id !== foodId)
        };
      }
      return meal;
    }));
  };

  const getTotalCalories = (meal: MealSlot) => {
    return meal.foods.reduce((sum, food) => sum + food.calories, 0);
  };

  const doshaBalance = calculateDoshaBalance();

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Diet Chart Builder</h2>
            <p className="text-muted-foreground">
              Drag and drop foods to create a balanced Ayurvedic meal plan
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Sparkles className="w-4 h-4" />
              AI Suggest
            </Button>
            <Button className="gap-2">
              <Save className="w-4 h-4" />
              Save Plan
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Food Library */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Food Library</CardTitle>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search foods..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {filteredFoods.map((food) => (
                <Card
                  key={food.id}
                  className="p-3 cursor-grab hover:shadow-md transition-shadow border-dashed"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', food.id);
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{food.name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {food.calories} cal
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {food.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Meal Planning Area */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Daily Meal Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <SortableContext items={meals.map(m => m.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {meals.map((meal) => {
                    const Icon = getMealIcon(meal.type);
                    const totalCalories = getTotalCalories(meal);
                    const caloriePercentage = (totalCalories / meal.targetCalories) * 100;
                    
                    return (
                      <Card
                        key={meal.id}
                        className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors min-h-24"
                        onDrop={(e) => {
                          e.preventDefault();
                          const foodId = e.dataTransfer.getData('text/plain');
                          handleDragEnd({
                            active: { id: foodId },
                            over: { id: meal.id }
                          } as DragEndEvent);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="w-5 h-5 text-primary" />
                              <h3 className="font-semibold capitalize">{meal.type}</h3>
                            </div>
                            <div className="text-right text-sm">
                              <span className={`font-medium ${caloriePercentage > 110 ? 'text-destructive' : caloriePercentage < 80 ? 'text-warning' : 'text-success'}`}>
                                {totalCalories}/{meal.targetCalories} cal
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {meal.foods.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                              <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>Drop foods here or click to add</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {meal.foods.map((food) => (
                                <div
                                  key={food.id}
                                  className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                                >
                                  <div>
                                    <span className="font-medium text-sm">{food.name}</span>
                                    <div className="flex gap-1 mt-1">
                                      {food.rasa.map((r) => (
                                        <Badge key={r} variant="outline" className="text-xs">
                                          {r}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {food.calories} cal
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeFoodFromMeal(meal.id, food.id)}
                                      className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                    >
                                      ×
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </SortableContext>
            </CardContent>
          </Card>

          {/* Dosha Balance & Analytics */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Dosha Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <DoshaBalanceChart
                vata={doshaBalance.vata}
                pitta={doshaBalance.pitta}
                kapha={doshaBalance.kapha}
                size={180}
                showLegend={false}
              />
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-vata">Vata</span>
                  <span className="text-sm font-medium">{doshaBalance.vata}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-pitta">Pitta</span>
                  <span className="text-sm font-medium">{doshaBalance.pitta}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-kapha">Kapha</span>
                  <span className="text-sm font-medium">{doshaBalance.kapha}%</span>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Total Calories:</span>
                    <span className="font-medium">
                      {meals.reduce((sum, meal) => sum + getTotalCalories(meal), 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target:</span>
                    <span className="font-medium">
                      {meals.reduce((sum, meal) => sum + meal.targetCalories, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <DragOverlay>
        {activeFood ? (
          <Card className="p-3 shadow-lg rotate-3 bg-card">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{activeFood.name}</h4>
                <Badge variant="secondary" className="text-xs">
                  {activeFood.calories} cal
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {activeFood.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};