import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOtpToken extends Document {
  email: string;
  otp: string;           // bcrypt hash of the 6-digit code
  expiresAt: Date;
  used: boolean;
}

const OtpTokenSchema = new Schema<IOtpToken>({
  email:     { type: String, required: true, lowercase: true, trim: true },
  otp:       { type: String, required: true },
  expiresAt: { type: Date,   required: true },
  used:      { type: Boolean, default: false },
});

// TTL index – MongoDB auto-deletes expired documents
OtpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpTokenModel: Model<IOtpToken> =
  mongoose.models.OtpToken ??
  mongoose.model<IOtpToken>("OtpToken", OtpTokenSchema);

export default OtpTokenModel;
