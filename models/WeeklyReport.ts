import mongoose, { Schema, Document, models } from "mongoose";

export interface IWeeklyReportDoc extends Document {
  userId: mongoose.Types.ObjectId;
  weekNo: number;
  startDate: string;
  endDate: string;
  isComplete: boolean;
  rawText: string;
  aiData: any;
}

const WeeklyReportSchema = new Schema<IWeeklyReportDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    weekNo: { type: Number, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    isComplete: { type: Boolean, default: false },
    rawText: { type: String, default: "" },
    aiData: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Ensure a user only has one report per week number
WeeklyReportSchema.index({ userId: 1, weekNo: 1 }, { unique: true });

export default models.WeeklyReport || mongoose.model<IWeeklyReportDoc>("WeeklyReport", WeeklyReportSchema);
