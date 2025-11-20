import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  AlertTriangle, 
  AlertCircle, 
  TrendingDown, 
  Calendar,
  User,
  Activity,
  Bell,
  Clock,
  XCircle
} from "lucide-react";

const PatientAlerts = () => {
  const { patients } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Generate critical alerts based on adherence and conditions
  const generateAlerts = () => {
    const alerts = [];

    patients.forEach(patient => {
      // Low adherence alerts
      if (patient.adherenceScore < 70) {
        alerts.push({
          id: `adherence-${patient.id}`,
          patientId: patient.id,
          patientName: patient.name,
          type: 'adherence',
          severity: patient.adherenceScore < 50 ? 'critical' : 'warning',
          title: 'Low Diet Adherence',
          message: `Adherence score has dropped to ${patient.adherenceScore}%`,
          timestamp: new Date().toISOString(),
          action: 'Schedule consultation',
          conditions: patient.conditions
        });
      }

      // Missing logs alert
      const daysSinceLastLog = Math.floor((new Date().getTime() - new Date(patient.lastLogDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastLog > 3) {
        alerts.push({
          id: `missing-log-${patient.id}`,
          patientId: patient.id,
          patientName: patient.name,
          type: 'missing_logs',
          severity: daysSinceLastLog > 7 ? 'critical' : 'warning',
          title: 'Missing Meal Logs',
          message: `No logs recorded for ${daysSinceLastLog} days`,
          timestamp: new Date().toISOString(),
          action: 'Send reminder',
          conditions: patient.conditions
        });
      }

      // Critical health conditions
      const criticalConditions = ['Type 2 Diabetes', 'High Blood Pressure', 'High Cholesterol'];
      const hasCriticalCondition = patient.conditions.some(condition => 
        criticalConditions.some(critical => condition.toLowerCase().includes(critical.toLowerCase()))
      );
      
      if (hasCriticalCondition && patient.adherenceScore < 80) {
        alerts.push({
          id: `critical-condition-${patient.id}`,
          patientId: patient.id,
          patientName: patient.name,
          type: 'critical_condition',
          severity: 'critical',
          title: 'Critical Health Condition',
          message: `Patient with ${patient.conditions.join(', ')} showing poor adherence`,
          timestamp: new Date().toISOString(),
          action: 'Immediate consultation',
          conditions: patient.conditions
        });
      }
    });

    return alerts.sort((a, b) => {
      // Sort by severity (critical first) then by timestamp
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  };

  const alerts = generateAlerts();
  
  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const criticalAlerts = filteredAlerts.filter(alert => alert.severity === 'critical');
  const warningAlerts = filteredAlerts.filter(alert => alert.severity === 'warning');

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return AlertTriangle;
      case 'warning': return AlertCircle;
      default: return Bell;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-white';
      case 'warning': return 'bg-warning text-white';
      default: return 'bg-info text-white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'adherence': return TrendingDown;
      case 'missing_logs': return Clock;
      case 'critical_condition': return AlertTriangle;
      default: return Bell;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AlertCard = ({ alert }: { alert: any }) => {
    const SeverityIcon = getSeverityIcon(alert.severity);
    const TypeIcon = getTypeIcon(alert.type);

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                <SeverityIcon className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base">{alert.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-3 h-3" />
                  {alert.patientName}
                </div>
              </div>
            </div>
            <Badge className={getSeverityColor(alert.severity)}>
              {alert.severity.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <p className="text-sm">{alert.message}</p>
            
            {alert.conditions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {alert.conditions.map((condition, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {condition}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {new Date(alert.timestamp).toLocaleString()}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  Dismiss
                </Button>
                <Button 
                  size="sm"
                  onClick={() => navigate(`/doctor/patients/${alert.patientId}`)}
                >
                  {alert.action}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patient Alerts</h1>
          <p className="text-muted-foreground">Monitor critical cases and urgent notifications</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive text-white">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{criticalAlerts.length}</p>
                <p className="text-sm text-muted-foreground">Critical Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning text-white">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{warningAlerts.length}</p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-info text-white">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alerts.length}</p>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Search patients or alerts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical Only</SelectItem>
            <SelectItem value="warning">Warnings Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="critical">Critical ({criticalAlerts.length})</TabsTrigger>
          <TabsTrigger value="warnings">Warnings ({warningAlerts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredAlerts.length > 0 ? (
            <div className="grid gap-4">
              {filteredAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <XCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No alerts found</h3>
                <p className="text-muted-foreground">All patients are doing well!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="critical" className="space-y-4">
          {criticalAlerts.length > 0 ? (
            <div className="grid gap-4">
              {criticalAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No critical alerts</h3>
                <p className="text-muted-foreground">No immediate attention required.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="warnings" className="space-y-4">
          {warningAlerts.length > 0 ? (
            <div className="grid gap-4">
              {warningAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No warnings</h3>
                <p className="text-muted-foreground">Everything looks good!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientAlerts;