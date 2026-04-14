// auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [], // Leave empty here, we will add Credentials in auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.internshipSite = user.internshipSite;
        token.requiredTotalHours = user.requiredTotalHours;
        token.startDate = user.startDate;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.internshipSite = token.internshipSite as string;
      session.user.requiredTotalHours = token.requiredTotalHours as number;
      session.user.startDate = token.startDate as string;
      return session;
    },
  },
} satisfies NextAuthConfig;