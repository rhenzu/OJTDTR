import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      internshipSite?: string;
      requiredTotalHours?: number;
      startDate?: string;
    } & DefaultSession["user"];
  }
  interface User {
    internshipSite?: string;
    requiredTotalHours?: number;
    startDate?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    internshipSite?: string;
    requiredTotalHours?: number;
    startDate?: string;
  }
}
