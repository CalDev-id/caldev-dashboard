import { auth } from "@/auth";

const noCacheHeaders = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
};

export async function GET() {
  try {
    const session = await auth();
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const sessionEmail = session?.user?.email;
    const isAdmin =
      typeof adminEmail === "string" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) &&
      typeof sessionEmail === "string" &&
      sessionEmail.trim().toLowerCase() === adminEmail;

    if (isAdmin) {
      return new Response(null, { status: 204, headers: noCacheHeaders });
    }
  } catch {
    // Fail closed if session validation is unavailable.
  }

  return new Response(null, { status: 401, headers: noCacheHeaders });
}
