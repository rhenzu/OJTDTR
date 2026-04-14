export interface IUser {
  _id: string;
  name: string;
  email: string;
  internshipSite: string;
  requiredTotalHours: number;
  extraHours: number;
  startDate: string; // YYYY-MM-DD
  createdAt: string;
}

export interface IDailyRecord {
  _id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  morningIn: string | null;   // ISO string
  morningOut: string | null;
  afternoonIn: string | null;
  afternoonOut: string | null;
  overtimeIn: string | null;
  overtimeOut: string | null;
  accomplishments: string;
  totalHours: number;
  isLate: boolean;
  isEarlyOut: boolean;
  verifiedBy: string;
  status: "complete" | "pending" | "absent";
  createdAt: string;
  updatedAt: string;
}

export interface IDTRForm {
  _id: string;
  userId: string;
  formId: string;
  startDate: string;
  endDate: string;
  periodTitle: string;
  totalHoursThisForm: number;
  previousHours: number;
  extraHours: number;
  remainingHours: number;
  supervisorSignature: string;
  studentSignature: string;
  supervisorSignDate: string;
  studentSignDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalHoursWorked: number;
  remainingHours: number;
  requiredTotalHours: number;
  progressPercent: number;
  totalDays: number;
  lateDays: number;
  earlyOutDays: number;
  avgTimeIn: string;
  avgTimeOut: string;
  avgHoursPerDay: number;
  estimatedDaysLeft: number;
}

export interface FormWithRecords {
  form: IDTRForm;
  records: Record<string, IDailyRecord>; // keyed by date
  days: string[];
}