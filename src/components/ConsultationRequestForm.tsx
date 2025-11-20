import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  User, 
  Stethoscope, 
  Send, 
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  IndianRupee
} from 'lucide-react';
import type { Doctor, CreateConsultationRequest } from '@/types/doctor';

interface ConsultationRequestFormProps {
  doctor: Doctor;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (requestData: CreateConsultationRequest) => Promise<void>;
  loading?: boolean;
}

const ConsultationRequestForm: React.FC<ConsultationRequestFormProps> = ({
  doctor,
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [formData, setFormData] = useState<CreateConsultationRequest>({
    doctorId: doctor.id,
    requestType: 'consultation',
    urgency: 'medium',
    patientDetails: {}
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        doctorId: doctor.id,
        requestType: 'consultation',
        urgency: 'medium',
        patientDetails: {}
      });
    } catch (error) {
      console.error('Error submitting request:', error);
    }
  };

  const updateFormData = (field: keyof CreateConsultationRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatDoctorName = (name: string) => {
    if (name.toLowerCase().startsWith('dr.')) {
      return name;
    }
    return `Dr. ${name}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            Request Consultation
          </DialogTitle>
          <DialogDescription>
            Send your consultation request to {formatDoctorName(doctor.name)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Doctor Info Summary */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{formatDoctorName(doctor.name)}</h3>
                  <p className="text-sm text-muted-foreground">{doctor.clinicName}</p>
                </div>
                {doctor.verificationStatus === 'verified' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {doctor.ayurvedicSpecialization?.slice(0, 3).map((spec, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {spec}
                  </Badge>
                ))}
                {doctor.consultationFee && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <IndianRupee className="w-3 h-3" />
                    {doctor.consultationFee} consultation
                  </Badge>
                )}
                {doctor.yearsOfExperience && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Clock className="w-3 h-3" />
                    {doctor.yearsOfExperience} years exp.
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Request Type */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Consultation Type</Label>
              <Select
                value={formData.requestType}
                onValueChange={(value) => updateFormData('requestType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select consultation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">General Consultation</SelectItem>
                  <SelectItem value="follow-up">Follow-up Consultation</SelectItem>
                  <SelectItem value="second-opinion">Second Opinion</SelectItem>
                  <SelectItem value="emergency">Emergency Consultation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Consultation Mode */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Preferred Consultation Mode</Label>
              <Select
                value={formData.preferredConsultationMode}
                onValueChange={(value) => updateFormData('preferredConsultationMode', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select consultation mode" />
                </SelectTrigger>
                <SelectContent>
                  {doctor.consultationModes?.map((mode) => (
                    <SelectItem key={mode} value={mode} className="capitalize">
                      {mode === 'online' ? 'Video Call Consultation' : 
                       mode === 'phone' ? 'Phone Call Consultation' : 
                       mode === 'in-person' ? 'In-Person Visit' :
                       mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Urgency */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Priority Level</Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) => updateFormData('urgency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority - Routine consultation or general inquiry</SelectItem>
                  <SelectItem value="medium">Medium Priority - Non-urgent health concerns</SelectItem>
                  <SelectItem value="high">High Priority - Urgent medical attention required</SelectItem>
                  <SelectItem value="emergency">Emergency - Immediate medical attention needed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Additional Message */}
            <div className="space-y-3">
              <Label htmlFor="message" className="text-base font-medium">
                Additional Information <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="message"
                placeholder="Please describe your health concerns, symptoms, or any specific questions you have for the doctor..."
                value={formData.message || ''}
                onChange={(e) => updateFormData('message', e.target.value)}
                className="min-h-[120px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This information will help the doctor better understand your needs and prepare for the consultation.
              </p>
            </div>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-2">What happens next?</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Your complete patient profile will be securely shared with the doctor</li>
                      <li>• {formatDoctorName(doctor.name)} will review your request and medical history</li>
                      <li>• You will receive a response within 24 hours</li>
                      <li>• If approved, you will receive consultation scheduling details</li>
                      <li>• Payment will be processed only after consultation confirmation</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending Request...
                  </div>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Consultation Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConsultationRequestForm;