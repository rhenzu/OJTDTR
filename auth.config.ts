import type { NextAuthConfig } from "next-auth";

const publicRoutes = ["/login", "/register", "/forgot-password"];

export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublic = publicRoutes.includes(nextUrl.pathname);
      if (isPublic) return true;
      return isLoggedIn;
    },
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
