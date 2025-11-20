// src/data/useFoodDatabase.ts
import { useEffect, useState } from "react";

export interface Food {
  id: string;
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  isVegetarian: boolean;
  isVegan: boolean;
  doshaVata: string;
  doshaPitta: string;
  doshaKapha: string;
}

export function useFoodDatabase() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/ayurvedic_food_database_clean.json") // fetch from public folder
      .then((res) => res.json())
      .then((data) => {
        const mappedFoods: Food[] = data.map((item: any) => ({
          id: item.id || "unknown",
          name: item.name || "Unknown",
          category: item.category || "generic",
          calories: item.calories ?? 0,
          protein: item.protein ?? 0,
          carbs: item.carbs ?? 0,
          fat: item.fat ?? 0,
          fiber: item.fiber ?? 0,
          isVegetarian: item.isVegetarian ?? false,
          isVegan: item.isVegan ?? false,
          doshaVata: item.ayurvedicProperties?.doshaEffect?.vata || "neutral",
          doshaPitta: item.ayurvedicProperties?.doshaEffect?.pitta || "neutral",
          doshaKapha: item.ayurvedicProperties?.doshaEffect?.kapha || "neutral",
        }));

        setFoods(mappedFoods);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load food database:", err);
        setLoading(false);
      });
  }, []);

  return { foods, loading };
}