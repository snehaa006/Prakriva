import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Baby,
  Droplet,
  HeartPulse,
  Info,
  Loader2,
  Pill,
  Ruler,
  Scale,
  Sparkles,
  User,
} from "lucide-react";

import {
  ageFromDob,
  bmiCategory,
  calcBmi,
  gestationalWeekFromLmp,
  trimesterOf,
} from "@/lib/health";
import {
  AnemiaStatus,
  MaternalAssessmentResult,
  PregnancyRisk,
  predictMaternalRisk,
} from "@/lib/maternalApi";

/* ------------------------------ profile ------------------------------ */

interface ProfileBasics {
  dob: string;
  age: number | null;
  heightCm: string;
  weightKg: string;
  lmpDate: string;
}

const EMPTY_PROFILE: ProfileBasics = {
  dob: "",
  age: null,
  heightCm: "",
  weightKg: "",
  lmpDate: "",
};

/* --------------------------- visit inputs ---------------------------- */

interface VisitForm {
  gestationalWeek: string;
  hemoglobin: string;
  ironSupplement: "Yes" | "No" | "";
  systolic: string;
  diastolic: string;
  weightKg: string;
  heightCm: string;
  age: string;
}

const EMPTY_VISIT: VisitForm = {
  gestationalWeek: "",
  hemoglobin: "",
  ironSupplement: "",
  systolic: "",
  diastolic: "",
  weightKg: "",
  heightCm: "",
  age: "",
};

interface StoredAssessment extends MaternalAssessmentResult {
  id: string;
  createdAt?: string;
  inputs?: Record<string, unknown>;
}

const ANEMIA_TONE: Record<AnemiaStatus, string> = {
  Normal: "bg-green-600",
  Mild: "bg-yellow-500",
  Moderate: "bg-orange-500",
  Severe: "bg-red-600",
};

const RISK_TONE: Record<PregnancyRisk, string> = {
  Low: "bg-green-600",
  Medium: "bg-yellow-500",
  High: "bg-red-600",
};

const ProbabilityBar = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) => (
  <div className="flex items-center gap-3">
    <span className="w-20 text-sm text-gray-600">{label}</span>
    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className={`h-full ${tone}`} style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
    <span className="w-12 text-right text-sm font-medium text-gray-700">
      {Math.round(value * 100)}%
    </span>
  </div>
);

const MaternalHealth = () => {
  const { user } = useApp();

  const [profile, setProfile] = useState<ProfileBasics>(EMPTY_PROFILE);
  const [form, setForm] = useState<VisitForm>(EMPTY_VISIT);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isPredicting, setIsPredicting] = useState(false);
  const [result, setResult] = useState<MaternalAssessmentResult | null>(null);
  const [history, setHistory] = useState<StoredAssessment[]>([]);

  /* Pull the values captured at onboarding — age (from DOB) and height are
     never asked again, weight and gestational week only pre-filled. */
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "patients", user.id));
        const data = snap.exists() ? snap.data() : {};
        const assessment = (data.assessmentData || {}) as Record<string, string>;

        const dob = (data.dob as string) || assessment.dob || "";
        const heightCm = String(data.heightCm ?? assessment.heightCm ?? "");
        const weightKg = String(data.weightKg ?? assessment.weightKg ?? "");
        const lmpDate = (data.lmpDate as string) || assessment.lmpDate || "";
        const age = ageFromDob(dob);

        setProfile({ dob, age, heightCm, weightKg, lmpDate });
        setForm((prev) => ({
          ...prev,
          heightCm,
          weightKg,
          age: age !== null ? String(age) : "",
          gestationalWeek:
            prev.gestationalWeek || String(gestationalWeekFromLmp(lmpDate) ?? ""),
        }));
      } catch (error) {
        console.error("Failed to load profile basics:", error);
        toast.error("Could not load your profile details. Please fill them in manually.");
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const snap = await getDocs(
        query(
          collection(db, "patients", user.id, "maternalAssessments"),
          orderBy("createdAt", "desc"),
          limit(5)
        )
      );
      setHistory(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StoredAssessment, "id">) }))
      );
    } catch (error) {
      console.error("Failed to load assessment history:", error);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const bmi = useMemo(
    () => calcBmi(form.weightKg, form.heightCm),
    [form.weightKg, form.heightCm]
  );

  const handleChange = (field: keyof VisitForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validate = (): string | null => {
    const age = parseInt(form.age, 10);
    if (!age || age < 10 || age > 60)
      return "Age must be between 10 and 60 — check your date of birth in your profile.";

    const height = parseFloat(form.heightCm);
    if (!height || height < 100 || height > 220) return "Enter a height between 100 and 220 cm.";

    const weight = parseFloat(form.weightKg);
    if (!weight || weight < 25 || weight > 200) return "Enter a weight between 25 and 200 kg.";

    const week = parseInt(form.gestationalWeek, 10);
    if (!week || week < 1 || week > 42) return "Gestational week must be between 1 and 42.";

    const hb = parseFloat(form.hemoglobin);
    if (!hb || hb < 2 || hb > 20) return "Hemoglobin must be between 2 and 20 g/dL.";

    if (!form.ironSupplement) return "Tell us whether you are taking iron supplements.";

    const systolic = parseInt(form.systolic, 10);
    const diastolic = parseInt(form.diastolic, 10);
    if (!systolic || systolic < 60 || systolic > 250)
      return "Systolic blood pressure must be between 60 and 250.";
    if (!diastolic || diastolic < 30 || diastolic > 160)
      return "Diastolic blood pressure must be between 30 and 160.";
    if (diastolic >= systolic) return "Systolic pressure must be higher than diastolic.";

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setIsPredicting(true);
    const inputs = {
      Age: parseInt(form.age, 10),
      Height_cm: parseFloat(form.heightCm),
      Weight_kg: parseFloat(form.weightKg),
      Gestational_Week: parseInt(form.gestationalWeek, 10),
      Hemoglobin_g_dL: parseFloat(form.hemoglobin),
      Iron_Supplement: form.ironSupplement as "Yes" | "No",
      Systolic_BP: parseInt(form.systolic, 10),
      Diastolic_BP: parseInt(form.diastolic, 10),
    };

    try {
      const prediction = await predictMaternalRisk({ Patient_ID: user?.id, ...inputs });
      setResult(prediction);

      if (user) {
        try {
          await addDoc(collection(db, "patients", user.id, "maternalAssessments"), {
            ...prediction,
            inputs,
            createdAt: new Date().toISOString(),
          });
          await loadHistory();
        } catch (saveError) {
          console.error("Failed to save assessment:", saveError);
          toast.warning("Prediction ready, but we couldn't save it to your record.");
        }
      }

      toast.success("Assessment complete");
    } catch (err) {
      console.error("Maternal prediction failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Could not reach the prediction service."
      );
    } finally {
      setIsPredicting(false);
    }
  };

  const week = parseInt(form.gestationalWeek, 10);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Baby className="w-6 h-6 text-green-700" />
          Maternal Anemia &amp; Pregnancy Risk
        </h1>
        <p className="text-gray-600 mt-1">
          Enter this visit's readings — your age and height come from your profile.
          Anemia status and pregnancy risk are predicted, never entered.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ------------------------------ inputs ------------------------------ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your readings</CardTitle>
            <CardDescription>
              Weight is asked every visit because it changes through pregnancy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingProfile ? (
              <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading your profile…
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {!profile.dob && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <Info className="w-4 h-4" />
                    <AlertDescription className="text-sm">
                      We couldn't find your date of birth or height. Fill them in below and
                      update your profile so we don't ask again.
                    </AlertDescription>
                  </Alert>
                )}

                {/* From the onboarding profile */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age" className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Age (years)
                    </Label>
                    <Input
                      id="age"
                      type="number"
                      min={10}
                      max={60}
                      value={form.age}
                      onChange={(e) => handleChange("age", e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {profile.dob ? "From your date of birth" : "Add your date of birth in Profile"}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="heightCm" className="flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5" /> Height (cm)
                    </Label>
                    <Input
                      id="heightCm"
                      type="number"
                      min={100}
                      max={220}
                      step="0.5"
                      value={form.heightCm}
                      onChange={(e) => handleChange("heightCm", e.target.value)}
                      placeholder="158"
                    />
                    <p className="text-xs text-gray-500 mt-1">From your profile</p>
                  </div>
                </div>

                {/* Captured this visit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="weightKg" className="flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5" /> Weight today (kg)
                    </Label>
                    <Input
                      id="weightKg"
                      type="number"
                      min={25}
                      max={200}
                      step="0.1"
                      value={form.weightKg}
                      onChange={(e) => handleChange("weightKg", e.target.value)}
                      placeholder="54"
                    />
                    {bmi !== null && (
                      <p className="text-xs text-gray-500 mt-1">
                        BMI {bmi} · {bmiCategory(bmi)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="gestationalWeek" className="flex items-center gap-1">
                      <Baby className="w-3.5 h-3.5" /> Gestational week
                    </Label>
                    <Input
                      id="gestationalWeek"
                      type="number"
                      min={1}
                      max={42}
                      value={form.gestationalWeek}
                      onChange={(e) => handleChange("gestationalWeek", e.target.value)}
                      placeholder="30"
                    />
                    {!Number.isNaN(week) && week >= 1 && week <= 42 && (
                      <p className="text-xs text-gray-500 mt-1">{trimesterOf(week)}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hemoglobin" className="flex items-center gap-1">
                      <Droplet className="w-3.5 h-3.5" /> Hemoglobin (g/dL)
                    </Label>
                    <Input
                      id="hemoglobin"
                      type="number"
                      min={2}
                      max={20}
                      step="0.1"
                      value={form.hemoglobin}
                      onChange={(e) => handleChange("hemoglobin", e.target.value)}
                      placeholder="11.2"
                    />
                    <p className="text-xs text-gray-500 mt-1">From your latest blood report</p>
                  </div>
                  <div>
                    <Label htmlFor="ironSupplement" className="flex items-center gap-1">
                      <Pill className="w-3.5 h-3.5" /> Iron supplement
                    </Label>
                    <Select
                      value={form.ironSupplement}
                      onValueChange={(value) => handleChange("ironSupplement", value)}
                    >
                      <SelectTrigger id="ironSupplement">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes — taking regularly</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-1">
                    <HeartPulse className="w-3.5 h-3.5" /> Blood pressure (mmHg)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label="Systolic blood pressure"
                      type="number"
                      min={60}
                      max={250}
                      value={form.systolic}
                      onChange={(e) => handleChange("systolic", e.target.value)}
                      placeholder="118"
                    />
                    <span className="text-gray-400">/</span>
                    <Input
                      aria-label="Diastolic blood pressure"
                      type="number"
                      min={30}
                      max={160}
                      value={form.diastolic}
                      onChange={(e) => handleChange("diastolic", e.target.value)}
                      placeholder="76"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isPredicting}>
                  {isPredicting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analysing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Check my risk
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------ results ----------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prediction</CardTitle>
            <CardDescription>
              Two models: anemia grading and overall pregnancy risk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="text-center text-gray-500 py-12">
                <Activity className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                Fill in this visit's readings to see your result.
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-800">Anemia status</span>
                    <Badge className={`${ANEMIA_TONE[result.anemia_status]} text-white`}>
                      {result.anemia_status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {(Object.keys(result.anemia_probabilities) as AnemiaStatus[]).map((label) => (
                      <ProbabilityBar
                        key={label}
                        label={label}
                        value={result.anemia_probabilities[label]}
                        tone={ANEMIA_TONE[label]}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-800">Pregnancy risk</span>
                    <Badge className={`${RISK_TONE[result.pregnancy_risk]} text-white`}>
                      {result.pregnancy_risk}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {(Object.keys(result.risk_probabilities) as PregnancyRisk[]).map((label) => (
                      <ProbabilityBar
                        key={label}
                        label={label}
                        value={result.risk_probabilities[label]}
                        tone={RISK_TONE[label]}
                      />
                    ))}
                  </div>
                </div>

                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription className="text-sm">
                    This is a screening aid, not a diagnosis. Share the result with your
                    doctor — especially if anemia is moderate or severe, or risk is high.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------ history ------------------------------ */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Previous checks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span className="text-gray-600">
                    {entry.createdAt
                      ? new Date(entry.createdAt).toLocaleDateString()
                      : "—"}
                    {typeof entry.inputs?.Gestational_Week === "number" &&
                      ` · week ${entry.inputs.Gestational_Week}`}
                    {typeof entry.inputs?.Hemoglobin_g_dL === "number" &&
                      ` · Hb ${entry.inputs.Hemoglobin_g_dL} g/dL`}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge className={`${ANEMIA_TONE[entry.anemia_status]} text-white`}>
                      {entry.anemia_status}
                    </Badge>
                    <Badge className={`${RISK_TONE[entry.pregnancy_risk]} text-white`}>
                      {entry.pregnancy_risk} risk
                    </Badge>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MaternalHealth;
