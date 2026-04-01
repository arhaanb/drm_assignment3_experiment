import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "drm_admin";
// Token = HMAC of password with a salt, so we never store the raw password in the cookie
function makeToken(password: string) {
  return crypto
    .createHmac("sha256", password)
    .update("drm-admin-session")
    .digest("hex");
}

// POST /api/admin — authenticate
export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string };
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = makeToken(expected);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return NextResponse.json({ ok: true });
}

// GET /api/admin — verify session
export async function GET() {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const valid = token === makeToken(expected);

  return NextResponse.json({ ok: valid }, { status: valid ? 200 : 401 });
}
