// hooks/useDoctors.ts
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  fetchDoctors, 
  searchDoctors, 
  createConsultationRequest, 
  checkExistingRequest 
} from '@/services/doctorService';
import type { Doctor, CreateConsultationRequest } from '@/types/doctor';

interface UseDoctorsReturn {
  // State
  doctors: Doctor[];
  filteredDoctors: Doctor[];
  loading: boolean;
  searchLoading: boolean;
  existingRequests: Set<string>;
  
  // Actions
  loadDoctors: () => Promise<void>;
  searchDoctorsQuery: (query: string) => Promise<void>;
  submitRequest: (requestData: CreateConsultationRequest) => Promise<string>;
  checkExisting: (doctorId: string) => Promise<boolean>;
  refreshExistingRequests: () => Promise<void>;
}

export const useDoctors = (): UseDoctorsReturn => {
  const { toast } = useToast();
  
  // State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [existingRequests, setExistingRequests] = useState<Set<string>>(new Set());

  // Load all doctors
  const loadDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const doctorsData = await fetchDoctors();
      setDoctors(doctorsData);
      setFilteredDoctors(doctorsData);
      
      // Check existing requests for all doctors
      await refreshExistingRequests(doctorsData);
      
    } catch (error) {
      console.error('Error loading doctors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load doctors. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Search doctors
  const searchDoctorsQuery = useCallback(async (query: string) => {
    try {
      setSearchLoading(true);
      
      if (!query.trim()) {
        setFilteredDoctors(doctors);
        return;
      }

      const results = await searchDoctors(query);
      setFilteredDoctors(results);
      
    } catch (error) {
      console.error('Error searching doctors:', error);
      toast({
        title: 'Search Error',
        description: 'Failed to search doctors. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSearchLoading(false);
    }
  }, [doctors, toast]);

  // Submit consultation request
  const submitRequest = useCallback(async (requestData: CreateConsultationRequest): Promise<string> => {
    try {
      const requestId = await createConsultationRequest(requestData);
      
      // Update existing requests state
      setExistingRequests(prev => new Set(prev).add(requestData.doctorId));
      
      toast({
        title: 'Request Sent Successfully',
        description: 'Your consultation request has been sent. You\'ll receive a response within 24 hours.',
      });
      
      return requestId;
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Request Failed',
        description: 'Failed to send consultation request. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  // Check if request exists for a specific doctor
  const checkExisting = useCallback(async (doctorId: string): Promise<boolean> => {
    try {
      const exists = await checkExistingRequest(doctorId);
      
      // Update local state
      if (exists) {
        setExistingRequests(prev => new Set(prev).add(doctorId));
      } else {
        setExistingRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(doctorId);
          return newSet;
        });
      }
      
      return exists;
    } catch (error) {
      console.error('Error checking existing request:', error);
      return false;
    }
  }, []);

  // Refresh existing requests for all doctors
  const refreshExistingRequests = useCallback(async (doctorsList?: Doctor[]) => {
    const doctorsToCheck = doctorsList || doctors;
    if (doctorsToCheck.length === 0) return;

    try {
      const requestChecks = await Promise.allSettled(
        doctorsToCheck.map(doctor => checkExistingRequest(doctor.id))
      );
      
      const existingSet = new Set<string>();
      requestChecks.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          existingSet.add(doctorsToCheck[index].id);
        }
      });
      
      setExistingRequests(existingSet);
    } catch (error) {
      console.error('Error refreshing existing requests:', error);
    }
  }, [doctors]);

  // Auto-load doctors on mount
  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  return {
    // State
    doctors,
    filteredDoctors,
    loading,
    searchLoading,
    existingRequests,
    
    // Actions
    loadDoctors,
    searchDoctorsQuery,
    submitRequest,
    checkExisting,
    refreshExistingRequests,
  };
};