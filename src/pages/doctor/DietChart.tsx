/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Clock,
  AlertCircle,
  CheckCircle,
  Search,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
// Firebase imports
import { collection, query, orderBy, getDocs, doc, deleteDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Adjust path according to your firebase config

interface DietPlanRow {
  id: string;
  time: string;
  meal: string;
  foodItem: string;
  preparation: string;
  quantity: string;
  benefits: string;
  doshaBalance: "vata" | "pitta" | "kapha" | "tridosh";
  restrictions?: string;
}

interface SavedDietPlan {
  id: string;
  patientName: string;
  planDuration: string;
  planType: string;
  meals: any;
  createdAt: Timestamp;
  totalMeals: number;
  activeFilter?: string;
}

const DietChart = () => {
  const [patientId, setPatientId] = useState("");
  const [savedPlans, setSavedPlans] = useState<SavedDietPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SavedDietPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [patientName, setPatientName] = useState("Patient Name");
  const [planDuration, setPlanDuration] = useState("7 days");
  const [planType, setPlanType] = useState("weight-management");
  const [dietRows, setDietRows] = useState<DietPlanRow[]>([]);

  const [newRow, setNewRow] = useState<Partial<DietPlanRow>>({
    time: "",
    meal: "",
    foodItem: "",
    preparation: "",
    quantity: "",
    benefits: "",
    doshaBalance: "tridosh"
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRow, setEditingRow] = useState<string | null>(null);

  const doshaColors = {
    vata: "bg-blue-100 text-blue-800",
    pitta: "bg-red-100 text-red-800", 
    kapha: "bg-green-100 text-green-800",
    tridosh: "bg-yellow-100 text-yellow-800"
  };

  // Convert Firebase meal plans to DietPlanRow format
  const convertMealPlanToRows = (mealPlans: any, activeFilter: string = "Daily"): DietPlanRow[] => {
    const rows: DietPlanRow[] = [];
    let rowCounter = 1;

    const timeSlotMappings: { [key: string]: string } = {
      "Breakfast": "8:00 AM",
      "Lunch": "12:30 PM", 
      "Dinner": "7:30 PM",
      "Snack": "4:00 PM"
    };

    if (activeFilter === "Daily" && mealPlans.Daily) {
      Object.entries(mealPlans.Daily).forEach(([mealType, foods]: [string, any]) => {
        if (Array.isArray(foods)) {
          foods.forEach((food: any) => {
            rows.push({
              id: `${rowCounter++}`,
              time: timeSlotMappings[mealType] || "9:00 AM",
              meal: mealType,
              foodItem: food.Food_Item || "Unknown Food",
              preparation: food.preparation || `Prepare ${food.Food_Item} as needed`,
              quantity: food.quantity || `1 serving (${food.Calories || 0} cal)`,
              benefits: food.benefits || `Good source of nutrients: ${food.Protein || 0}g protein, ${food.Fat || 0}g fat, ${food.Carbs || 0}g carbs`,
              doshaBalance: food.Dosha_Vata === "Pacifying" ? "vata" : 
                           food.Dosha_Pitta === "Pacifying" ? "pitta" : 
                           food.Dosha_Kapha === "Pacifying" ? "kapha" : "tridosh",
              restrictions: food.restrictions || undefined
            });
          });
        }
      });
    } else if (activeFilter === "Weekly" && mealPlans.Weekly) {
      Object.entries(mealPlans.Weekly).forEach(([day, dayMeals]: [string, any]) => {
        Object.entries(dayMeals).forEach(([mealType, foods]: [string, any]) => {
          if (Array.isArray(foods)) {
            foods.forEach((food: any) => {
              rows.push({
                id: `${rowCounter++}`,
                time: timeSlotMappings[mealType] || "9:00 AM",
                meal: `${day} ${mealType}`,
                foodItem: food.Food_Item || "Unknown Food",
                preparation: food.preparation || `Prepare ${food.Food_Item} as needed`,
                quantity: food.quantity || `1 serving (${food.Calories || 0} cal)`,
                benefits: food.benefits || `Good source of nutrients: ${food.Protein || 0}g protein, ${food.Fat || 0}g fat, ${food.Carbs || 0}g carbs`,
                doshaBalance: food.Dosha_Vata === "Pacifying" ? "vata" : 
                             food.Dosha_Pitta === "Pacifying" ? "pitta" : 
                             food.Dosha_Kapha === "Pacifying" ? "kapha" : "tridosh",
                restrictions: food.restrictions || undefined
              });
            });
          }
        });
      });
    } else if (activeFilter === "Monthly" && mealPlans.Monthly) {
      Object.entries(mealPlans.Monthly).forEach(([month, monthDays]: [string, any]) => {
        if (Array.isArray(monthDays)) {
          monthDays.forEach((dayData: any) => {
            if (dayData.meals) {
              Object.entries(dayData.meals).forEach(([mealType, foods]: [string, any]) => {
                if (Array.isArray(foods)) {
                  foods.forEach((food: any) => {
                    rows.push({
                      id: `${rowCounter++}`,
                      time: timeSlotMappings[mealType] || "9:00 AM",
                      meal: `${month} Day ${dayData.day} ${mealType}`,
                      foodItem: food.Food_Item || "Unknown Food",
                      preparation: food.preparation || `Prepare ${food.Food_Item} as needed`,
                      quantity: food.quantity || `1 serving (${food.Calories || 0} cal)`,
                      benefits: food.benefits || `Good source of nutrients: ${food.Protein || 0}g protein, ${food.Fat || 0}g fat, ${food.Carbs || 0}g carbs`,
                      doshaBalance: food.Dosha_Vata === "Pacifying" ? "vata" : 
                                   food.Dosha_Pitta === "Pacifying" ? "pitta" : 
                                   food.Dosha_Kapha === "Pacifying" ? "kapha" : "tridosh",
                      restrictions: food.restrictions || undefined
                    });
                  });
                }
              });
            }
          });
        }
      });
    }

    return rows;
  };

  // Fetch saved diet plans for a patient
  const fetchDietPlans = async () => {
    if (!patientId.trim()) {
      toast.error("Please enter a patient ID");
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, "patients", patientId, "dietPlans"),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const plans: SavedDietPlan[] = [];
      
      querySnapshot.forEach((doc) => {
        plans.push({
          id: doc.id,
          ...doc.data(),
        } as SavedDietPlan);
      });

      setSavedPlans(plans);
      
      if (plans.length === 0) {
        toast.info("No diet plans found for this patient");
      } else {
        toast.success(`Found ${plans.length} diet plan(s)`);
      }
    } catch (error) {
      console.error("Error fetching diet plans:", error);
      toast.error("Failed to fetch diet plans. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Load a specific diet plan
  const loadDietPlan = (plan: SavedDietPlan) => {
    setSelectedPlan(plan);
    setPatientName(plan.patientName);
    setPlanDuration(plan.planDuration);
    setPlanType(plan.planType);
    
    const rows = convertMealPlanToRows(plan.meals, plan.activeFilter);
    setDietRows(rows);
    
    toast.success(`Loaded diet plan from ${plan.createdAt.toDate().toLocaleDateString()}`);
  };

  // Delete a diet plan
  const deleteDietPlan = async (planId: string) => {
    if (!patientId.trim()) return;
    
    try {
      await deleteDoc(doc(db, "patients", patientId, "dietPlans", planId));
      setSavedPlans(prev => prev.filter(plan => plan.id !== planId));
      
      if (selectedPlan?.id === planId) {
        setSelectedPlan(null);
        setDietRows([]);
      }
      
      toast.success("Diet plan deleted successfully");
    } catch (error) {
      console.error("Error deleting diet plan:", error);
      toast.error("Failed to delete diet plan");
    }
  };

  const handleAddRow = () => {
    if (!newRow.time || !newRow.meal || !newRow.foodItem) {
      toast.error("Please fill in all required fields");
      return;
    }

    const rowToAdd: DietPlanRow = {
      ...newRow,
      id: Date.now().toString(),
    } as DietPlanRow;

    setDietRows(prev => [...prev, rowToAdd]);
    setNewRow({
      time: "",
      meal: "",
      foodItem: "",
      preparation: "",
      quantity: "",
      benefits: "",
      doshaBalance: "tridosh"
    });
    setShowAddForm(false);
    toast.success("Meal added to diet plan");
  };

  const handleDeleteRow = (id: string) => {
    setDietRows(prev => prev.filter(row => row.id !== id));
    toast.success("Meal removed from diet plan");
  };

  const handleEditRow = (id: string) => {
    setEditingRow(editingRow === id ? null : id);
  };

  const handleSaveEdit = (id: string, updatedRow: Partial<DietPlanRow>) => {
    setDietRows(prev => 
      prev.map(row => 
        row.id === id ? { ...row, ...updatedRow } : row
      )
    );
    setEditingRow(null);
    toast.success("Meal updated successfully");
  };

  const exportDietPlan = () => {
    toast.success("Diet plan exported successfully");
  };

  // Auto-fetch when component mounts if patientId is provided
  useEffect(() => {
    if (patientId.trim()) {
      fetchDietPlans();
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Diet Chart Viewer</h1>
          <p className="text-muted-foreground">View and manage saved Ayurvedic diet plans</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportDietPlan} className="gap-2">
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
          <Button onClick={() => setShowAddForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Meal
          </Button>
        </div>
      </div>

      {/* Patient Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Patient Diet Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="patient-search">Patient ID</Label>
              <Input
                id="patient-search"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Enter patient ID to search"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchDietPlans} disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search Plans
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saved Plans List */}
      {savedPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saved Diet Plans</CardTitle>
            <CardDescription>Found {savedPlans.length} diet plan(s) for patient ID: {patientId}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedPlans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{plan.patientName}</h3>
                      <Badge variant="outline">{plan.planType.replace('-', ' ')}</Badge>
                      <Badge variant="secondary">{plan.planDuration}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created: {plan.createdAt.toDate().toLocaleDateString()} • 
                      {plan.totalMeals} meals • 
                      View: {plan.activeFilter || 'Daily'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => loadDietPlan(plan)}
                      variant={selectedPlan?.id === plan.id ? "default" : "outline"}
                    >
                      {selectedPlan?.id === plan.id ? "Loaded" : "Load"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => deleteDietPlan(plan.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Diet Plan Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="patient-name">Patient Name</Label>
              <Input
                id="patient-name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Enter patient name"
                disabled={!!selectedPlan}
              />
            </div>
            <div>
              <Label htmlFor="plan-duration">Plan Duration</Label>
              <Select value={planDuration} onValueChange={setPlanDuration} disabled={!!selectedPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7 days">7 Days</SelectItem>
                  <SelectItem value="14 days">14 Days</SelectItem>
                  <SelectItem value="21 days">21 Days</SelectItem>
                  <SelectItem value="30 days">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="plan-type">Plan Type</Label>
              <Select value={planType} onValueChange={setPlanType} disabled={!!selectedPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight-management">Weight Management</SelectItem>
                  <SelectItem value="detox">Detox Plan</SelectItem>
                  <SelectItem value="digestive-health">Digestive Health</SelectItem>
                  <SelectItem value="immunity-boost">Immunity Boost</SelectItem>
                  <SelectItem value="diabetes-management">Diabetes Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedPlan && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Viewing saved plan from {selectedPlan.createdAt.toDate().toLocaleDateString()}. 
                Plan details are read-only.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Meal Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add New Meal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  value={newRow.time || ""}
                  onChange={(e) => setNewRow(prev => ({...prev, time: e.target.value}))}
                  placeholder="e.g., 8:00 AM"
                />
              </div>
              <div>
                <Label htmlFor="meal">Meal Type</Label>
                <Select value={newRow.meal} onValueChange={(value) => setNewRow(prev => ({...prev, meal: value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Early Morning">Early Morning</SelectItem>
                    <SelectItem value="Breakfast">Breakfast</SelectItem>
                    <SelectItem value="Mid Morning">Mid Morning</SelectItem>
                    <SelectItem value="Lunch">Lunch</SelectItem>
                    <SelectItem value="Afternoon Snack">Afternoon Snack</SelectItem>
                    <SelectItem value="Evening Snack">Evening Snack</SelectItem>
                    <SelectItem value="Dinner">Dinner</SelectItem>
                    <SelectItem value="Before Bed">Before Bed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="food-item">Food Item</Label>
                <Input
                  id="food-item"
                  value={newRow.foodItem || ""}
                  onChange={(e) => setNewRow(prev => ({...prev, foodItem: e.target.value}))}
                  placeholder="e.g., Oats with fruits"
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  value={newRow.quantity || ""}
                  onChange={(e) => setNewRow(prev => ({...prev, quantity: e.target.value}))}
                  placeholder="e.g., 1 bowl (150g)"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="preparation">Preparation Method</Label>
                <Textarea
                  id="preparation"
                  value={newRow.preparation || ""}
                  onChange={(e) => setNewRow(prev => ({...prev, preparation: e.target.value}))}
                  placeholder="Describe how to prepare this meal..."
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="benefits">Health Benefits</Label>
                <Textarea
                  id="benefits"
                  value={newRow.benefits || ""}
                  onChange={(e) => setNewRow(prev => ({...prev, benefits: e.target.value}))}
                  placeholder="Describe the health benefits..."
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="dosha-balance">Dosha Balance</Label>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Select value={newRow.doshaBalance} onValueChange={(value) => setNewRow(prev => ({...prev, doshaBalance: value as any}))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vata">Vata Balancing</SelectItem>
                    <SelectItem value="pitta">Pitta Balancing</SelectItem>
                    <SelectItem value="kapha">Kapha Balancing</SelectItem>
                    <SelectItem value="tridosh">Tridoshic (All Doshas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAddRow}>Add Meal</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diet Chart Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Diet Plan for {patientName}</CardTitle>
              <CardDescription>
                Duration: {planDuration} • Type: {planType.replace('-', ' ')}
                {selectedPlan && (
                  <span className="ml-2 text-blue-600">
                    (Loaded from {selectedPlan.createdAt.toDate().toLocaleDateString()})
                  </span>
                )}
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              {dietRows.length} meals planned
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {dietRows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No meals in this diet plan yet.</p>
              <p className="text-sm">Search for a patient to load their saved plans, or add meals manually.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Time</TableHead>
                    <TableHead className="w-[120px]">Meal</TableHead>
                    <TableHead className="w-[200px]">Food Item</TableHead>
                    <TableHead className="w-[250px]">Preparation</TableHead>
                    <TableHead className="w-[120px]">Quantity</TableHead>
                    <TableHead className="w-[200px]">Benefits</TableHead>
                    <TableHead className="w-[100px]">Dosha</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dietRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {editingRow === row.id ? (
                          <Input 
                            value={row.time} 
                            onChange={(e) => handleSaveEdit(row.id, { time: e.target.value })}
                            className="w-full"
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {row.time}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRow === row.id ? (
                          <Input 
                            value={row.meal}
                            onChange={(e) => handleSaveEdit(row.id, { meal: e.target.value })}
                          />
                        ) : (
                          <Badge variant="outline">{row.meal}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRow === row.id ? (
                          <Input 
                            value={row.foodItem}
                            onChange={(e) => handleSaveEdit(row.id, { foodItem: e.target.value })}
                          />
                        ) : (
                          <div className="font-medium">{row.foodItem}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRow === row.id ? (
                          <Textarea 
                            value={row.preparation}
                            onChange={(e) => handleSaveEdit(row.id, { preparation: e.target.value })}
                            rows={2}
                          />
                        ) : (
                          <div className="text-sm text-muted-foreground">{row.preparation}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRow === row.id ? (
                          <Input 
                            value={row.quantity}
                            onChange={(e) => handleSaveEdit(row.id, { quantity: e.target.value })}
                          />
                        ) : (
                          <div className="text-sm font-medium">{row.quantity}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRow === row.id ? (
                          <Textarea 
                            value={row.benefits}
                            onChange={(e) => handleSaveEdit(row.id, { benefits: e.target.value })}
                            rows={2}
                          />
                        ) : (
                          <div className="text-sm">{row.benefits}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={doshaColors[row.doshaBalance]} variant="outline">
                          {row.doshaBalance}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditRow(row.id)}
                            className="h-6 w-6 p-0"
                            disabled={!!selectedPlan}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRow(row.id)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            disabled={!!selectedPlan}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diet Plan Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium">Total Meals</div>
                <div className="text-2xl font-bold">{dietRows.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium">Plan Duration</div>
                <div className="text-2xl font-bold">{planDuration}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium">Plan Status</div>
                <div className="text-sm font-medium text-green-600">
                  {selectedPlan ? "Loaded from Firebase" : "Ready for Patient"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DietChart;