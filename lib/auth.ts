import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "@/lib/db";

const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "dev-nextauth-secret-change-me",
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        const path = url.split("?")[0];
        if (path === "/login") return `${baseUrl}/`;
        return `${baseUrl}${url}`;
      }
      try {
        const parsed = new URL(url);
        if (parsed.origin !== baseUrl) return `${baseUrl}/`;
        if (parsed.pathname === "/login") return `${baseUrl}/`;
        return url;
      } catch {
        return `${baseUrl}/`;
      }
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      const hasProject = await db.project.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!hasProject) {
        await db.project.create({
          data: {
            userId: user.id,
            name: "General",
            description: "Default project",
          },
        });
      }
    },
  },
};
