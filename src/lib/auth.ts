import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        const emailRaw = credentials?.email;
        const nameRaw = credentials?.name;

        const email = emailRaw ? String(emailRaw).trim().toLowerCase() : "";
        const name = nameRaw ? String(nameRaw).trim() : null;

        if (!email) return null;

        const user = await prisma.user.upsert({
          where: { email },
          create: { email, name },
          update: { name },
        });

        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token?.sub) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

