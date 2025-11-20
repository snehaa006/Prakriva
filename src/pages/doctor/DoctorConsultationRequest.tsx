import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { User, CheckCircle, Clock } from "lucide-react";
import type { Doctor } from "@/types/doctor";

interface ConsultationRequest {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  requestType: "consultation" | "follow-up" | "emergency";
  mode: "in-person" | "video-call" | "phone";
  urgency: "low" | "medium" | "high" | "emergency";
  message?: string;
  date: Date; // use date instead of createdAt
  status: "pending" | "accepted" | "rejected";
}

const DoctorConsultationRequests = () => {
  const { doctor, consultationRequests } = useApp(); // Ensure context provides doctor and requests
  const [requests, setRequests] = useState<ConsultationRequest[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (consultationRequests && doctor) {
      setRequests(
        consultationRequests.filter((req: ConsultationRequest) => req.doctorId === doctor.id)
      );
    }
  }, [consultationRequests, doctor]);

  const openChat = (patientId: string) => {
    navigate(`/doctor/chat/${patientId}`);
  };

  const formatPatientName = (name: string) => {
    if (!name) return "Unknown";
    return name;
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-3xl font-bold">Consultation Requests</h1>

      {requests.length === 0 ? (
        <p className="text-muted-foreground">No consultation requests yet.</p>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardHeader className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    {formatPatientName(req.patientName)}
                  </CardTitle>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline">{req.requestType}</Badge>
                    <Badge variant="outline">{req.urgency}</Badge>
                    <Badge variant="outline">{req.mode.replace("-", " ")}</Badge>
                  </div>
                </div>
                {req.status === "accepted" && (
                  <Button size="sm" onClick={() => openChat(req.patientId)}>
                    Chat
                  </Button>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                {req.message && <p className="text-sm mb-2">{req.message}</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {new Date(req.date).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorConsultationRequests;