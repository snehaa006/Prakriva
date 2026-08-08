/** Client for the maternal anemia / pregnancy-risk endpoint on the Flask backend. */

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5001";

export type AnemiaStatus = "Normal" | "Mild" | "Moderate" | "Severe";
export type PregnancyRisk = "Low" | "Medium" | "High";

/** Everything the two models need. Age/height are reused from the profile. */
export interface MaternalAssessmentInput {
  Patient_ID?: string;
  Age?: number;
  Date_of_Birth?: string;
  Height_cm?: number;
  Weight_kg?: number;
  BMI?: number;
  Gestational_Week: number;
  Hemoglobin_g_dL: number;
  Iron_Supplement: "Yes" | "No";
  Systolic_BP?: number;
  Diastolic_BP?: number;
  Blood_Pressure?: string;
}

export interface MaternalAssessmentResult {
  anemia_status: AnemiaStatus;
  anemia_confidence: number;
  anemia_probabilities: Record<AnemiaStatus, number>;
  pregnancy_risk: PregnancyRisk;
  risk_confidence: number;
  risk_probabilities: Record<PregnancyRisk, number>;
  features_used: Record<string, number | null>;
  patient_id?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export const predictMaternalRisk = async (
  input: MaternalAssessmentInput
): Promise<MaternalAssessmentResult> => {
  const response = await fetch(`${API_BASE_URL}/maternal/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  let body: ApiResponse<MaternalAssessmentResult> | null = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON error page (backend down, proxy error, …)
  }

  if (!response.ok || !body?.success || !body.data) {
    throw new Error(
      body?.error || body?.message || `Prediction failed (HTTP ${response.status})`
    );
  }

  return body.data;
};
