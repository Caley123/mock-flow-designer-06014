export type UserRole = 'supervisor' | 'tutor' | 'director' | 'admin';

export type ReincidenceLevel = 0 | 1 | 2 | 3 | 4;

export type FaultCategory = 'Conducta' | 'Uniforme' | 'Académica' | 'Puntualidad';

export type FaultSeverity = 'Leve' | 'Grave';

export type IncidentStatus = 'Activa' | 'Anulada';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  grade: string;
  section: string;
  barcode: string;
  photo?: string;
  reincidenceLevel: ReincidenceLevel;
  faultsLast60Days: number;
  active: boolean;
}

export interface FaultType {
  id: string;
  code: string;
  name: string;
  description: string;
  category: FaultCategory;
  severity: FaultSeverity;
  points: number;
  active: boolean;
}

export interface Incident {
  id: string;
  studentId: string;
  student: Student;
  faultTypeId: string;
  faultType: FaultType;
  registeredBy: string;
  registeredByUser: User;
  registeredAt: string;
  observations: string;
  reincidenceLevel: ReincidenceLevel;
  hasEvidence: boolean;
  evidenceCount: number;
  status: IncidentStatus;
  annulledBy?: string;
  annulledAt?: string;
  annulmentReason?: string;
}

export interface IncidentEvidence {
  id: string;
  incidentId: string;
  filename: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Comment {
  id: string;
  incidentId: string;
  userId: string;
  user: User;
  content: string;
  createdAt: string;
}

export interface DashboardStats {
  totalIncidents: number;
  incidentsToday: number;
  incidentsThisWeek: number;
  incidentsThisMonth: number;
  studentsWithIncidents: number;
  averageReincidenceLevel: number;
  levelDistribution: {
    level0: number;
    level1: number;
    level2: number;
    level3: number;
    level4: number;
  };
  topFaults: Array<{
    faultType: string;
    count: number;
  }>;
  incidentsByGrade: Array<{
    grade: string;
    count: number;
  }>;
}
