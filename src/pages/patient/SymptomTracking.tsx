import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar, TrendingDown, TrendingUp, BarChart3, Activity } from "lucide-react";

// Mock Firebase functions - Replace with actual Firebase imports and functions
const mockFetchUserDigestiveIssues = async (userId) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Mock user data based on your selection - replace with actual Firebase call
  return ["bloating", "constipation", "irregular-bowels"];
};

const mockFetchSymptomHistory = async (userId, days = 7) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // Mock 7 days of data - replace with actual Firebase call
  const today = new Date();
  const mockData = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    mockData.push({
      date: dateStr,
      dateDisplay: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      bloating: Math.floor(Math.random() * 4),
      gas: Math.floor(Math.random() * 4),
      "acidity-heartburn": Math.floor(Math.random() * 4),
      constipation: Math.floor(Math.random() * 4),
      "irregular-bowels": Math.floor(Math.random() * 4),
    });
  }
  
  return mockData;
};

const mockSaveSymptomData = async (userId, date, symptoms, notes) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log("Saving to Firebase:", { userId, date, symptoms, notes });
  return true;
};

const SymptomTracking = () => {
  const handleNavigation = (path) => {
    console.log(`Navigate to: ${path}`);
    // Replace with actual navigation logic
  };
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [symptoms, setSymptoms] = useState([]);
  const [symptomHistory, setSymptomHistory] = useState([]);
  const [userDigestiveIssues, setUserDigestiveIssues] = useState([]);

  // All available digestive issues with their properties (using keys that match Firebase storage)
  const allDigestiveIssues = {
    "bloating": { 
      name: "Bloating", 
      key: "bloating",
      color: "#10b981", 
      description: "Abdominal distension, gas buildup" 
    },
    "gas": { 
      name: "Gas", 
      key: "gas",
      color: "#f59e0b", 
      description: "Flatulence, gas-related discomfort" 
    },
    "acidity-heartburn": { 
      name: "Acidity/Heartburn", 
      key: "acidity-heartburn",
      color: "#ef4444", 
      description: "Acid reflux, burning sensation" 
    },
    "constipation": { 
      name: "Constipation", 
      key: "constipation",
      color: "#8b5cf6", 
      description: "Difficulty in bowel movement" 
    },
    "irregular-bowels": { 
      name: "Irregular bowel movements", 
      key: "irregular-bowels",
      color: "#06b6d4", 
      description: "Inconsistent bowel patterns" 
    }
  };

  const getSeverityLabel = (level) => {
    const labels = ["None", "Mild", "Moderate", "Severe"];
    return labels[level] || "None";
  };

  const getSeverityColor = (level) => {
    const colors = [
      "bg-gray-100 text-gray-700 border-gray-200",
      "bg-yellow-50 text-yellow-700 border-yellow-200", 
      "bg-orange-50 text-orange-700 border-orange-200",
      "bg-red-50 text-red-700 border-red-200"
    ];
    return colors[level] || colors[0];
  };

  const handleSliderChange = (index, value) => {
    const newSymptoms = [...symptoms];
    newSymptoms[index].level = value[0];
    setSymptoms(newSymptoms);
  };

  const handleSaveSymptoms = async () => {
    setSaving(true);
    try {
      const userId = "current-user-id"; // Replace with actual user ID from auth
      const symptomData = symptoms.reduce((acc, symptom) => {
        acc[symptom.key] = symptom.level;
        return acc;
      }, {});
      
      await mockSaveSymptomData(userId, selectedDate, symptomData, notes);
      
      // Refresh the symptom history after saving
      const newHistory = await mockFetchSymptomHistory(userId);
      setSymptomHistory(newHistory);
      
      // Reset form
      setNotes("");
      const resetSymptoms = symptoms.map(s => ({ ...s, level: 0 }));
      setSymptoms(resetSymptoms);
      
      alert("Symptoms logged successfully!");
    } catch (error) {
      console.error("Error saving symptoms:", error);
      alert("Error saving symptoms. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const userId = "current-user-id"; // Replace with actual user ID from auth
        
        // Fetch user's selected digestive issues
        const userIssues = await mockFetchUserDigestiveIssues(userId);
        setUserDigestiveIssues(userIssues);
        
        // Create symptoms array based on user's digestive issues
        const userSymptoms = userIssues.map(issueKey => {
          const issue = allDigestiveIssues[issueKey];
          if (issue) {
            return {
              ...issue,
              level: 0
            };
          }
          return null;
        }).filter(Boolean); // Filter out any undefined issues
        
        setSymptoms(userSymptoms);
        
        // Fetch symptom history for graphs
        const history = await mockFetchSymptomHistory(userId);
        setSymptomHistory(history);
        
      } catch (error) {
        console.error("Error loading user data:", error);
        alert("Error loading your data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const getAverageSymptomLevel = (symptomKey) => {
    if (symptomHistory.length === 0) return 0;
    
    const total = symptomHistory.reduce((sum, day) => sum + (day[symptomKey] || 0), 0);
    return total / symptomHistory.length;
  };

  const getFormattedAverage = (symptomKey) => {
    return getAverageSymptomLevel(symptomKey).toFixed(1);
  };

  const getWeeklyInsights = (symptomKey) => {
    if (symptomHistory.length === 0) {
      return {
        average: 0,
        formattedAverage: "0.0",
        trend: "stable",
        daysWithSymptoms: 0,
        highestLevel: 0,
        lowestLevel: 0
      };
    }

    const values = symptomHistory.map(day => day[symptomKey] || 0);
    const average = getAverageSymptomLevel(symptomKey);
    const trend = getTrend(symptomKey);
    const daysWithSymptoms = values.filter(val => val > 0).length;
    const highestLevel = Math.max(...values);
    const lowestLevel = Math.min(...values);

    return {
      average,
      formattedAverage: average.toFixed(1),
      trend,
      daysWithSymptoms,
      highestLevel,
      lowestLevel,
      totalDays: symptomHistory.length
    };
  };

  const getTrend = (symptomKey) => {
    if (symptomHistory.length < 2) return "stable";
    
    const recent = symptomHistory.slice(-3);
    const earlier = symptomHistory.slice(0, -3);
    
    if (earlier.length === 0) return "stable";
    
    const recentAvg = recent.reduce((sum, day) => sum + (day[symptomKey] || 0), 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, day) => sum + (day[symptomKey] || 0), 0) / earlier.length;
    
    if (recentAvg > earlierAvg + 0.2) return "increasing";
    if (recentAvg < earlierAvg - 0.2) return "decreasing";
    return "stable";
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your symptom tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Symptom & Health Tracking</h1>
            <p className="text-gray-600 mt-2">
              Monitor your daily symptoms and track improvement over time
            </p>
            {userDigestiveIssues.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-sm text-gray-500">Tracking:</span>
                {userDigestiveIssues.map(issueKey => {
                  const issue = allDigestiveIssues[issueKey];
                  return issue ? (
                    <Badge key={issueKey} variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                      {issue.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
          <Button 
            variant="outline" 
            onClick={() => handleNavigation("/patient/dashboard")}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Back to Dashboard
          </Button>
        </div>

        {symptoms.length === 0 ? (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="py-16 text-center">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-6" />
              <h3 className="text-xl font-semibold mb-3 text-gray-900">No Digestive Issues Selected</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                You haven't selected any digestive issues to track. Update your health profile to get started.
              </p>
              <Button 
                onClick={() => handleNavigation("/profile-setup")}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Update Health Profile
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Daily Symptom Log */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <Calendar className="w-5 h-5 text-gray-700" />
                  Daily Symptom Log
                </CardTitle>
                <CardDescription className="text-gray-600">Rate your symptoms for today</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm text-gray-700 flex-1"
                  />
                </div>

                {symptoms.map((symptom, index) => (
                  <div key={symptom.name} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{symptom.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{symptom.description}</p>
                      </div>
                      <Badge className={`${getSeverityColor(symptom.level)} text-xs px-2 py-1`}>
                        {getSeverityLabel(symptom.level)}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <Slider
                        value={[symptom.level]}
                        onValueChange={(val) => handleSliderChange(index, val)}
                        max={3}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>None</span>
                        <span>Mild</span>
                        <span>Moderate</span>
                        <span>Severe</span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-900">Additional Notes</label>
                  <Textarea
                    placeholder="Describe any other symptoms, triggers, or observations..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                  />
                </div>

                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 font-medium" 
                  onClick={handleSaveSymptoms}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Log Today's Symptoms"}
                </Button>
              </CardContent>
            </Card>

            {/* Symptom Trends Graph */}
            <Card className="lg:col-span-2 bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <TrendingDown className="w-5 h-5 text-green-600" />
                  7-Day Symptom Trends
                </CardTitle>
                <CardDescription className="text-gray-600">Track your symptoms over the past week</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={symptomHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                      <XAxis 
                        dataKey="dateDisplay" 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        domain={[0, 3]} 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={{ stroke: '#d1d5db' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value, name) => [
                          getSeverityLabel(value), 
                          symptoms.find(s => s.key === name)?.name || name
                        ]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      {symptoms.map((symptom) => (
                        <Line 
                          key={symptom.key}
                          type="monotone" 
                          dataKey={symptom.key}
                          stroke={symptom.color} 
                          strokeWidth={3}
                          dot={{ fill: symptom.color, strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 7, fill: symptom.color, stroke: '#ffffff', strokeWidth: 2 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Summary */}
            <Card className="lg:col-span-3 bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="flex items-center gap-3 text-gray-900">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Weekly Summary & Insights
                </CardTitle>
                <CardDescription className="text-gray-600">Average levels and trends for each symptom</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {symptomHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-500 mb-2">No Data Available</h4>
                    <p className="text-gray-400">Start logging your symptoms to see weekly insights and trends.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {symptoms.map((symptom) => {
                      const insights = getWeeklyInsights(symptom.key);
                      const TrendIcon = insights.trend === "increasing" ? TrendingUp : 
                                      insights.trend === "decreasing" ? TrendingDown : Activity;
                      const trendColor = insights.trend === "increasing" ? "text-red-500" : 
                                       insights.trend === "decreasing" ? "text-green-500" : "text-blue-500";
                      
                      const trendBgColor = insights.trend === "increasing" ? "bg-red-50" : 
                                         insights.trend === "decreasing" ? "bg-green-50" : "bg-blue-50";

                      return (
                        <div key={symptom.key} className="p-5 border border-gray-200 rounded-lg bg-gray-50 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-gray-900 text-sm">{symptom.name}</h4>
                            <div className={`p-2 rounded-full ${trendBgColor}`}>
                              <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            {/* Average Level */}
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">7-day average:</span>
                              <Badge className={`${getSeverityColor(Math.round(insights.average))} text-xs px-2 py-1 font-medium`}>
                                {insights.formattedAverage}
                              </Badge>
                            </div>
                            
                            {/* Trend */}
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Trend:</span>
                              <span className={`text-xs capitalize font-medium ${trendColor}`}>
                                {insights.trend}
                              </span>
                            </div>
                            
                            {/* Days with symptoms */}
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Days affected:</span>
                              <span className="text-xs font-medium text-gray-800">
                                {insights.daysWithSymptoms}/{insights.totalDays} days
                              </span>
                            </div>
                            
                            {/* Severity range */}
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Severity range:</span>
                              <span className="text-xs font-medium text-gray-800">
                                {getSeverityLabel(insights.lowestLevel)} - {getSeverityLabel(insights.highestLevel)}
                              </span>
                            </div>
                            
                            {/* Progress indicator */}
                            <div className="pt-2">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-gray-500">Weekly progress</span>
                                <span className={`text-xs font-medium ${trendColor}`}>
                                  {insights.trend === "decreasing" ? "Improving" : 
                                   insights.trend === "increasing" ? "Worsening" : 
                                   "Stable"}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    insights.trend === "decreasing" ? "bg-green-500" :
                                    insights.trend === "increasing" ? "bg-red-500" :
                                    "bg-blue-500"
                                  }`}
                                  style={{ 
                                    width: `${Math.min(100, (insights.daysWithSymptoms / insights.totalDays) * 100)}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SymptomTracking;