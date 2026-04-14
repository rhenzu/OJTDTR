import mongoose, { Schema, Document, models } from "mongoose";

export interface IDTRFormDoc extends Document {
  userId: mongoose.Types.ObjectId;
  formId: string;
  startDate: string;
  endDate: string;
  periodTitle: string;
  totalHoursThisForm: number;
  previousHours: number;
  remainingHours: number;
  supervisorSignature: string;
  studentSignature: string;
  supervisorSignDate: string;
  studentSignDate: string;
}

const DTRFormSchema = new Schema<IDTRFormDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    formId: { type: String, required: true, unique: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    periodTitle: { type: String, required: true },
    totalHoursThisForm: { type: Number, default: 0 },
    previousHours: { type: Number, default: 0 },
    remainingHours: { type: Number, default: 0 },
    supervisorSignature: { type: String, default: "" },
    studentSignature: { type: String, default: "" },
    supervisorSignDate: { type: String, default: "" },
    studentSignDate: { type: String, default: "" },
  },
  { timestamps: true }
);

DTRFormSchema.index({ userId: 1, startDate: 1 });

export default models.DTRForm || mongoose.model<IDTRFormDoc>("DTRForm", DTRFormSchema);
