import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyAdminPassword } from "@/lib/admin-password";
import { beginLoginAttempt } from "@/lib/login-rate-limit";

export const { handlers, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const finishAttempt = beginLoginAttempt(request);
        if (!finishAttempt) return null;

        let failed = false;
        try {
          const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
          const email = typeof credentials.email === "string" ? credentials.email.trim().toLowerCase() : "";
          const password = typeof credentials.password === "string" ? credentials.password : "";
          const passwordValid = await verifyAdminPassword(password, process.env.ADMIN_PASSWORD_HASH);

          if (!adminEmail || email !== adminEmail || !passwordValid) {
            failed = true;
            return null;
          }
          return { id: "admin", email: adminEmail, name: "Admin" };
        } finally {
          finishAttempt(failed);
        }
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  secret: process.env.AUTH_SECRET,
  trustHost: process.env.NODE_ENV === "development" || process.env.AUTH_TRUST_HOST === "true",
  useSecureCookies: process.env.NODE_ENV === "production",
});
