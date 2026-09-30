import { create } from 'zustand';

export type ProfessionType =
  | 'medecin_cabinet'
  | 'pharmacie'
  | 'clinique'
  | 'home_doctor'
  | 'medical_supplies'
  | 'nurse';

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp: string;
  gender: 'male' | 'female' | '';
  languages: string[];
  biography: string;
  yearsOfExperience: number;
  licenseNumber: string;
  avatarUrl: string;
}

export interface OrganizationInfo {
  name: string;
  logoUrl: string;
  description: string;
  phone: string;
  whatsapp: string;
  website: string;
}

export interface AddressInfo {
  region: string;
  city: string;
  streetAddress: string;
  postalCode: string;
  city_id?: string;
  /** Picked on the map (optional — onboarding never blocks on it). */
  latitude?: number | null;
  longitude?: number | null;
}

export interface FacilityInfo {
  name: string;
  phone: string;
  parkingAvailable: boolean;
  wheelchairAccessible: boolean;
  emergencyServices: boolean;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  serviceType: 'consultation' | 'treatment' | 'examination' | 'laboratory' | 'radiology' | 'vaccination' | 'other';
  bookingMode: 'office' | 'home' | 'teleconsultation';
  durationMinutes: number;
  price: number;
}

export interface WorkingHours {
  weekday: string;
  startTime: string;
  endTime: string;
}

export interface DocFile {
  uri: string;
  name: string;
  size: number;
}

export interface VerificationDocs {
  licenseDocument: DocFile | null;
  nationalIdDocument: DocFile | null;
  professionalOrderDocument: DocFile | null;
}

interface OnboardingState {
  currentStep: number;
  claimedProviderId: string | null;
  claimedProviderName: string | null;
  profession: ProfessionType | null;
  selectedSpecialtyIds: string[];
  personalInfo: PersonalInfo;
  organizationInfo: OrganizationInfo;
  address: AddressInfo;
  facility: FacilityInfo;
  services: ServiceItem[];
  workingHours: WorkingHours[];
  verificationDocs: VerificationDocs;
  agreedToTerms: boolean;
  isComplete: boolean;
  isSubmitting: boolean;

  setCurrentStep: (step: number) => void;
  setClaimedProfile: (id: string | null, name?: string | null) => void;
  clearClaimedProfile: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setProfession: (profession: ProfessionType) => void;
  setSelectedSpecialtyIds: (ids: string[]) => void;
  setPersonalInfo: (info: Partial<PersonalInfo>) => void;
  setOrganizationInfo: (info: Partial<OrganizationInfo>) => void;
  setAddress: (addr: Partial<AddressInfo>) => void;
  setFacility: (fac: Partial<FacilityInfo>) => void;
  setServices: (services: ServiceItem[]) => void;
  addService: (service: ServiceItem) => void;
  removeService: (id: string) => void;
  updateService: (id: string, updates: Partial<ServiceItem>) => void;
  setWorkingHours: (hours: WorkingHours[]) => void;
  setVerificationDocs: (docs: Partial<VerificationDocs>) => void;
  setAgreedToTerms: (agreed: boolean) => void;
  setIsSubmitting: (submitting: boolean) => void;
  setIsComplete: (complete: boolean) => void;
  reset: () => void;
}

const initialPersonalInfo: PersonalInfo = {
  firstName: '', lastName: '', phone: '', whatsapp: '', gender: '',
  languages: [], biography: '', yearsOfExperience: 0, licenseNumber: '', avatarUrl: '',
};

const initialOrganizationInfo: OrganizationInfo = {
  name: '', logoUrl: '', description: '', phone: '', whatsapp: '', website: '',
};

const initialAddress: AddressInfo = {
  region: '', city: '', streetAddress: '', postalCode: '', latitude: null, longitude: null,
};

const initialFacility: FacilityInfo = {
  name: '', phone: '', parkingAvailable: false, wheelchairAccessible: false, emergencyServices: false,
};

const initialVerificationDocs: VerificationDocs = {
  licenseDocument: null, nationalIdDocument: null, professionalOrderDocument: null,
};

const defaultWorkingHours: WorkingHours[] = [
  { weekday: 'monday', startTime: '09:00', endTime: '17:00' },
  { weekday: 'tuesday', startTime: '09:00', endTime: '17:00' },
  { weekday: 'wednesday', startTime: '09:00', endTime: '17:00' },
  { weekday: 'thursday', startTime: '09:00', endTime: '17:00' },
  { weekday: 'friday', startTime: '09:00', endTime: '17:00' },
];

export const useOnboardingStore = create<OnboardingState>((set) => ({
  currentStep: 0,
  claimedProviderId: null,
  claimedProviderName: null,
  profession: null,
  selectedSpecialtyIds: [],
  personalInfo: initialPersonalInfo,
  organizationInfo: initialOrganizationInfo,
  address: initialAddress,
  facility: initialFacility,
  services: [],
  workingHours: defaultWorkingHours,
  verificationDocs: initialVerificationDocs,
  agreedToTerms: false,
  isComplete: false,
  isSubmitting: false,

  setCurrentStep: (step) => set({ currentStep: step }),
  setClaimedProfile: (id, name = null) => set({ claimedProviderId: id, claimedProviderName: name }),
  clearClaimedProfile: () => set({ claimedProviderId: null, claimedProviderName: null }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 5) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 0) })),
  setProfession: (profession) => set({ profession }),
  setSelectedSpecialtyIds: (ids) => set({ selectedSpecialtyIds: ids }),
  setPersonalInfo: (info) => set((s) => ({ personalInfo: { ...s.personalInfo, ...info } })),
  setOrganizationInfo: (info) => set((s) => ({ organizationInfo: { ...s.organizationInfo, ...info } })),
  setAddress: (addr) => set((s) => ({ address: { ...s.address, ...addr } })),
  setFacility: (fac) => set((s) => ({ facility: { ...s.facility, ...fac } })),
  setServices: (services) => set({ services }),
  addService: (service) => set((s) => ({ services: [...s.services, service] })),
  removeService: (id) => set((s) => ({ services: s.services.filter((x) => x.id !== id) })),
  updateService: (id, updates) => set((s) => ({
    services: s.services.map((x) => (x.id === id ? { ...x, ...updates } : x)),
  })),
  setWorkingHours: (hours) => set({ workingHours: hours }),
  setVerificationDocs: (docs) => set((s) => ({ verificationDocs: { ...s.verificationDocs, ...docs } })),
  setAgreedToTerms: (agreed) => set({ agreedToTerms: agreed }),
  setIsSubmitting: (submitting) => set({ isSubmitting: submitting }),
  setIsComplete: (complete) => set({ isComplete: complete }),

  reset: () => set({
    currentStep: 0, claimedProviderId: null, claimedProviderName: null, profession: null, selectedSpecialtyIds: [],
    personalInfo: initialPersonalInfo, organizationInfo: initialOrganizationInfo,
    address: initialAddress, facility: initialFacility, services: [],
    workingHours: defaultWorkingHours, verificationDocs: initialVerificationDocs,
    agreedToTerms: false, isComplete: false, isSubmitting: false,
  }),
}));