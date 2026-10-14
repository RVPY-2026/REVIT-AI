import { PublicHeader } from "@/components/layout/PublicHeader";
import { getCurrentUser } from "@/server/auth/session";

export async function PublicHeaderWithSession() {
  const user = await getCurrentUser();
  const identity = user
    ? { name: user.name, email: user.email, roles: user.roles }
    : null;

  return <PublicHeader user={identity} />;
}
