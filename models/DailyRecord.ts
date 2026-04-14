import mongoose, { Schema, Document, models } from "mongoose";

export interface IDailyRecordDoc extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  morningIn: string | null;
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
}

const DailyRecordSchema = new Schema<IDailyRecordDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    morningIn: { type: String, default: null },
    morningOut: { type: String, default: null },
    afternoonIn: { type: String, default: null },
    afternoonOut: { type: String, default: null },
    overtimeIn: { type: String, default: null },
    overtimeOut: { type: String, default: null },
    accomplishments: { type: String, default: "" },
    totalHours: { type: Number, default: 0 },
    isLate: { type: Boolean, default: false },
    isEarlyOut: { type: Boolean, default: false },
    verifiedBy: { type: String, default: "" },
    status: { type: String, enum: ["complete", "pending", "absent"], default: "pending" },
  },
  { timestamps: true }
);

DailyRecordSchema.index({ userId: 1, date: 1 }, { unique: true });

export default models.DailyRecord || mongoose.model<IDailyRecordDoc>("DailyRecord", DailyRecordSchema);
