import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

export interface Food {
  id: string; // Unique ID for React keys
  Food_Item: string;
  Category: string;
  Calories: number;
  Protein: number;
  Carbs: number;
  Fat: number;
  Vegetarian: string;
  Vegan: string;
  Dosha_Vata: string;
  Dosha_Pitta: string;
  Dosha_Kapha: string;
  Food_Group: string;
}

interface FoodContextType {
  foods: Food[];
  selectedFoods: Food[];
  addToSelectedFoods: (food: Food) => void;
  removeFromSelectedFoods: (food: Food) => void;
  setSelectedFoods: React.Dispatch<React.SetStateAction<Food[]>>; // 👈 for drag & drop
}

const FoodContext = createContext<FoodContextType | undefined>(undefined);

export const FoodProvider = ({ children }: { children: ReactNode }) => {
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<Food[]>([]);

  // 🔹 Load foods from JSON file in public folder
  useEffect(() => {
    fetch("/foodDatabase.json")
      .then((res) => res.json())
      .then((data: Omit<Food, "id">[]) => {
        // Add unique IDs if your data doesn't have one
        const foodsWithId: Food[] = data.map((item, index) => ({
          ...item,
          id: `${item.Food_Item}-${index}`,
        }));
        setFoods(foodsWithId);
      })
      .catch((err) => console.error("Error loading food database:", err));
  }, []);

  // 🔹 Add to selectedFoods (no duplicates)
  const addToSelectedFoods = (food: Food) => {
    setSelectedFoods((prev) =>
      prev.some((f) => f.id === food.id) ? prev : [...prev, food]
    );
  };

  // 🔹 Remove from selectedFoods
  const removeFromSelectedFoods = (food: Food) => {
    setSelectedFoods((prev) => prev.filter((f) => f.id !== food.id));
  };

  return (
    <FoodContext.Provider
      value={{
        foods,
        selectedFoods,
        addToSelectedFoods,
        removeFromSelectedFoods,
        setSelectedFoods, // 👈 expose for drag & drop reorder
      }}
    >
      {children}
    </FoodContext.Provider>
  );
};

// ✅ Custom hook
export const useFoodContext = () => {
  const context = useContext(FoodContext);
  if (!context) {
    throw new Error("useFoodContext must be used within a FoodProvider");
  }
  return context;
};