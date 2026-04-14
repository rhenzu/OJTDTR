// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import UserModel from "@/models/User";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          await dbConnect();
          const user = await UserModel.findOne({
            email: (credentials.email as string).toLowerCase().trim(),
          });
          if (!user) return null;
          const valid = await compare(credentials.password as string, user.passwordHash);
          if (!valid) return null;
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            internshipSite: user.internshipSite,
            requiredTotalHours: user.requiredTotalHours,
            startDate: user.startDate,
          };
        } catch (err) {
          console.error("Auth error:", err);
          return null;
        }
      },
    }),
  ],
});