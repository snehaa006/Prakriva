/**
 * Shared health-metric helpers.
 *
 * The onboarding questionnaire captures date of birth and height once; every
 * later form (the maternal anemia check in particular) derives age and BMI from
 * those instead of asking again.
 */

/** Age in whole years from an ISO date of birth ("1998-04-12"). */
export const ageFromDob = (dob?: string | null): number | null => {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const monthDiff = today.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

/** Accepts 165, "165", "165 cm" or feet.inches ("5.2" -> 5ft 2in). */
export const heightToCm = (value?: string | number | null): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const match = String(value).match(/(\d+\.?\d*)/);
  if (!match) return null;

  const v = parseFloat(match[1]);
  if (Number.isNaN(v)) return null;
  if (v < 8) {
    // feet.inches notation
    const feet = Math.floor(v);
    const inches = Math.round((v - feet) * 10);
    return Math.round((feet * 12 + inches) * 2.54 * 10) / 10;
  }
  return v;
};

export const calcBmi = (
  weightKg?: number | string | null,
  heightCm?: number | string | null
): number | null => {
  const w = typeof weightKg === "string" ? parseFloat(weightKg) : weightKg;
  const h = heightToCm(heightCm);
  if (!w || !h || w <= 0 || h <= 0) return null;
  return Math.round((w / (h / 100) ** 2) * 10) / 10;
};

export const bmiCategory = (bmi: number | null): string => {
  if (bmi === null) return "";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
};

/** Weeks of gestation from the first day of the last menstrual period. */
export const gestationalWeekFromLmp = (lmp?: string | null): number | null => {
  if (!lmp) return null;
  const start = new Date(lmp);
  if (Number.isNaN(start.getTime())) return null;
  const weeks = Math.floor((Date.now() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  if (weeks < 0 || weeks > 45) return null;
  return weeks;
};

export const trimesterOf = (week: number | null): string => {
  if (week === null) return "";
  if (week <= 13) return "1st trimester";
  if (week <= 27) return "2nd trimester";
  return "3rd trimester";
};
