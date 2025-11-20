export interface UserProfile {
    age: number;
    gender: string;
    height: number;
    weight: number;
    activity_level: string; // sedentary | moderate | active
    goal: string; // weight_loss | weight_gain | maintenance
    preferences: string[]; // ['vegetarian']
    allergies: string[]; // ['milk']
    cuisine?: string;
    ayurveda_profile?: any; // mapping from form
    user_id?: string;
  }
  