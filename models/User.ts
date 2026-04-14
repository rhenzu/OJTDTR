import mongoose, { Schema, Document, models } from "mongoose";

export interface IUserDoc extends Document {
  name: string;
  email: string;
  passwordHash: string;
  internshipSite: string;
  requiredTotalHours: number;
  extraHours: number;
  startDate: string;
}

const UserSchema = new Schema<IUserDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    internshipSite: { type: String, default: "" },
    requiredTotalHours: { type: Number, default: 486 },
    extraHours: { type: Number, default: 0 },
    startDate: { type: String, required: true }, // YYYY-MM-DD
  },
  { timestamps: true }
);

export default models.User || mongoose.model<IUserDoc>("User", UserSchema);