import { noStoreJson, enforceSameOriginForMutations } from "../../../../lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sameOrigin = enforceSameOriginForMutations(req);
  if (!sameOrigin.ok) {
    return noStoreJson({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const res = noStoreJson({ ok: true });

  // Clear legacy membership cookies (these can cause "still member" UI when logged out)
  res.cookies.set("swp_member", "", { path: "/", maxAge: 0 });
  res.cookies.set("swp_member_email", "", { path: "/", maxAge: 0 });

  return res;
}