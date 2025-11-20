// src/pages/doctor/FoodExplorer.tsx
import React, { useState, useMemo } from "react";
import { useFoodContext, Food } from "@/context/FoodContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Minus, 
  Search, 
  Filter,
  ShoppingCart,
  Utensils,
  Leaf,
  Award,
  Info
} from "lucide-react";
import { toast } from "sonner";

const FoodExplorer: React.FC = () => {
  const { foods, selectedFoods, addToSelectedFoods, removeFromSelectedFoods, setSelectedFoods } = useFoodContext();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedFoodGroup, setSelectedFoodGroup] = useState("All");
  const [doshaFilter, setDoshaFilter] = useState("All");
  const [dietaryFilter, setDietaryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Helper function to clear selected foods
  const clearAllSelected = () => {
    setSelectedFoods([]);
  };

  const categories = ["All", ...Array.from(new Set(foods.map(f => f.Category)))];
  const foodGroups = ["All", ...Array.from(new Set(foods.map(f => f.Food_Group)))];
  const doshaOptions = ["All", "Vata Pacifying", "Pitta Pacifying", "Kapha Pacifying"];
  const dietaryOptions = ["All", "Vegetarian", "Vegan", "Non-Vegetarian"];

  const filteredAndSortedFoods = useMemo(() => {
    const filtered = foods.filter(f => {
      const matchesSearch = f.Food_Item.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "All" || f.Category === selectedCategory;
      const matchesFoodGroup = selectedFoodGroup === "All" || f.Food_Group === selectedFoodGroup;
      
      const matchesDosha = doshaFilter === "All" || 
        (doshaFilter === "Vata Pacifying" && f.Dosha_Vata === "Pacifying") ||
        (doshaFilter === "Pitta Pacifying" && f.Dosha_Pitta === "Pacifying") ||
        (doshaFilter === "Kapha Pacifying" && f.Dosha_Kapha === "Pacifying");
      
      const matchesDietary = dietaryFilter === "All" ||
        (dietaryFilter === "Vegetarian" && f.Vegetarian === "Yes") ||
        (dietaryFilter === "Vegan" && f.Vegan === "Yes") ||
        (dietaryFilter === "Non-Vegetarian" && f.Vegetarian === "No");
      
      return matchesSearch && matchesCategory && matchesFoodGroup && matchesDosha && matchesDietary;
    });

    // Sort filtered foods
   // Sort filtered foods
   return filtered.sort((a, b) => {
      switch (sortBy) {
        case "calories":
          return Number(b.Calories) - Number(a.Calories);
        case "protein":
          return Number(b.Protein) - Number(a.Protein);
        case "name":
        default:
          return a.Food_Item.localeCompare(b.Food_Item);
      }
    });

    return filtered;
  }, [foods, search, selectedCategory, selectedFoodGroup, doshaFilter, dietaryFilter, sortBy]);

  const isSelected = (food: Food) => selectedFoods.some(f => f.Food_Item === food.Food_Item);

  const getDoshaColor = (food: Food) => {
    if (food.Dosha_Vata === "Pacifying") return "bg-blue-100 text-blue-800";
    if (food.Dosha_Pitta === "Pacifying") return "bg-red-100 text-red-800";
    if (food.Dosha_Kapha === "Pacifying") return "bg-green-100 text-green-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const getDoshaLabel = (food: Food) => {
    if (food.Dosha_Vata === "Pacifying") return "Vata";
    if (food.Dosha_Pitta === "Pacifying") return "Pitta";
    if (food.Dosha_Kapha === "Pacifying") return "Kapha";
    return "Neutral";
  };

  const clearAllFilters = () => {
    setSearch("");
    setSelectedCategory("All");
    setSelectedFoodGroup("All");
    setDoshaFilter("All");
    setDietaryFilter("All");
    setSortBy("name");
  };

  const addAllFiltered = () => {
    let addedCount = 0;
    filteredAndSortedFoods.forEach(food => {
      if (!isSelected(food)) {
        addToSelectedFoods(food);
        addedCount++;
      }
    });
    if (addedCount > 0) {
      toast.success(`Added ${addedCount} foods to selection`);
    } else {
      toast.info("All filtered foods are already selected");
    }
  };

  const FoodCard = ({ food }: { food: Food }) => (
    <Card className="h-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg leading-tight">{food.Food_Item}</CardTitle>
          <Badge className={getDoshaColor(food)} variant="outline">
            {getDoshaLabel(food)}
          </Badge>
        </div>
        <CardDescription className="text-sm">
          <Badge variant="secondary" className="mr-1">{food.Category}</Badge>
          {food.Vegetarian === "Yes" && <Badge variant="outline" className="mr-1 text-green-600"><Leaf className="w-3 h-3 mr-1" />Veg</Badge>}
          {food.Vegan === "Yes" && <Badge variant="outline" className="mr-1 text-green-700"><Award className="w-3 h-3 mr-1" />Vegan</Badge>}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Calories:</span>
              <span className="font-medium">{food.Calories}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Protein:</span>
              <span className="font-medium">{food.Protein}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Carbs:</span>
              <span className="font-medium">{food.Carbs}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fat:</span>
              <span className="font-medium">{food.Fat}g</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <p><strong>Food Group:</strong> {food.Food_Group}</p>
            <div className="flex items-center gap-2 mt-1">
              <span><strong>Dosha Effects:</strong></span>
              <div className="flex gap-1">
                {food.Dosha_Vata === "Pacifying" && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600">V↓</Badge>}
                {food.Dosha_Pitta === "Pacifying" && <Badge variant="outline" className="text-xs bg-red-50 text-red-600">P↓</Badge>}
                {food.Dosha_Kapha === "Pacifying" && <Badge variant="outline" className="text-xs bg-green-50 text-green-600">K↓</Badge>}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            {!isSelected(food) ? (
              <Button 
                size="sm" 
                onClick={() => {
                  addToSelectedFoods(food);
                  toast.success(`Added ${food.Food_Item} to selection`);
                }}
                className="flex-1 gap-1"
              >
                <Plus className="w-3 h-3" />
                Add to Selection
              </Button>
            ) : (
              <div className="flex gap-1 flex-1">
                <Button 
                  size="sm" 
                  disabled 
                  variant="secondary"
                  className="flex-1"
                >
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  Added
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    removeFromSelectedFoods(food);
                    toast.success(`Removed ${food.Food_Item} from selection`);
                  }}
                >
                  <Minus className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const FoodListItem = ({ food }: { food: Food }) => (
    <Card className="mb-2">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{food.Food_Item}</h3>
              <Badge className={`${getDoshaColor(food)} text-xs`} variant="outline">
                {getDoshaLabel(food)}
              </Badge>
              <Badge variant="secondary" className="text-xs">{food.Category}</Badge>
              {food.Vegetarian === "Yes" && <Badge variant="outline" className="text-xs text-green-600"><Leaf className="w-2 h-2 mr-1" />Veg</Badge>}
              {food.Vegan === "Yes" && <Badge variant="outline" className="text-green-700"><Award className="w-3 h-3 mr-1" />Vegan</Badge>}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{food.Calories} cal</span>
              <span>{food.Protein}g protein</span>
              <span>{food.Fat}g fat</span>
              <span>{food.Carbs}g carbs</span>
              <span>{food.Food_Group}</span>
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            {!isSelected(food) ? (
              <Button 
                size="sm" 
                onClick={() => {
                  addToSelectedFoods(food);
                  toast.success(`Added ${food.Food_Item} to selection`);
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            ) : (
              <>
                <Button size="sm" disabled variant="secondary">
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  Added
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    removeFromSelectedFoods(food);
                    toast.success(`Removed ${food.Food_Item} from selection`);
                  }}
                >
                  <Minus className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">🍽️ Food Explorer</h1>
          <p className="text-muted-foreground">Discover and select foods for your Ayurvedic diet plans</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <ShoppingCart className="w-3 h-3" />
            {selectedFoods.length} selected
          </Badge>
          {selectedFoods.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                clearAllSelected();
                toast.success("Cleared all selections");
              }}
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                Clear Filters
              </Button>
              <Button variant="outline" size="sm" onClick={addAllFiltered}>
                Add All Filtered
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              >
                {viewMode === "grid" ? "List View" : "Grid View"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-4">
            <div>
              <Label htmlFor="search">Search Foods</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search food..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="food-group">Food Group</Label>
              <Select value={selectedFoodGroup} onValueChange={setSelectedFoodGroup}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {foodGroups.map(group => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dosha">Dosha Effect</Label>
              <Select value={doshaFilter} onValueChange={setDoshaFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {doshaOptions.map(dosha => (
                    <SelectItem key={dosha} value={dosha}>{dosha}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dietary">Dietary Type</Label>
              <Select value={dietaryFilter} onValueChange={setDietaryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dietaryOptions.map(diet => (
                    <SelectItem key={diet} value={diet}>{diet}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sort">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="calories">Calories (High-Low)</SelectItem>
                  <SelectItem value="protein">Protein (High-Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {filteredAndSortedFoods.length} of {foods.length} foods</span>
            <span>{selectedFoods.length} foods selected for meal planning</span>
          </div>
        </CardContent>
      </Card>

      {/* Selected Foods Quick View */}
      {selectedFoods.length > 0 && (
        <Card className="mb-6 bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-green-600" />
              Selected Foods ({selectedFoods.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedFoods.slice(0, 10).map((food) => (
                <Badge 
                  key={food.Food_Item} 
                  variant="secondary" 
                  className="gap-1 cursor-pointer hover:bg-red-100"
                  onClick={() => {
                    removeFromSelectedFoods(food);
                    toast.success(`Removed ${food.Food_Item} from selection`);
                  }}
                >
                  {food.Food_Item}
                  <Minus className="w-3 h-3" />
                </Badge>
              ))}
              {selectedFoods.length > 10 && (
                <Badge variant="outline">+{selectedFoods.length - 10} more...</Badge>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Button 
                size="sm" 
                onClick={() => {
                  clearAllSelected();
                  toast.success("Cleared all selections");
                }}
                variant="outline"
              >
                Clear All
              </Button>
              <Button size="sm" className="gap-1">
                <Utensils className="w-3 h-3" />
                Go to Recipe Builder
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Food List/Grid */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedFoods.length > 0 ? filteredAndSortedFoods.map((food, index) => (
            <FoodCard key={`${food.Food_Item}-${index}`} food={food} />
          )) : (
            <div className="col-span-full text-center py-12">
              <Info className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No foods found</p>
              <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
              <Button variant="outline" className="mt-4" onClick={clearAllFilters}>
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div>
          {filteredAndSortedFoods.length > 0 ? filteredAndSortedFoods.map((food, index) => (
            <FoodListItem key={`${food.Food_Item}-${index}`} food={food} />
          )) : (
            <div className="text-center py-12">
              <Info className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No foods found</p>
              <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
              <Button variant="outline" className="mt-4" onClick={clearAllFilters}>
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Nutrition Summary for Selected Foods */}
      {selectedFoods.length > 0 && (
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">Selected Foods Nutrition Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {selectedFoods.reduce((acc, f) => acc + Number(f.Calories), 0).toFixed(0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Calories</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {selectedFoods.reduce((acc, f) => acc + Number(f.Protein), 0).toFixed(1)}g
                </p>
                <p className="text-sm text-muted-foreground">Total Protein</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {selectedFoods.reduce((acc, f) => acc + Number(f.Fat), 0).toFixed(1)}g
                </p>
                <p className="text-sm text-muted-foreground">Total Fat</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {selectedFoods.reduce((acc, f) => acc + Number(f.Carbs), 0).toFixed(1)}g
                </p>
                <p className="text-sm text-muted-foreground">Total Carbs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FoodExplorer;