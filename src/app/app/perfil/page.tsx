import { currentUser } from "@/server/auth";
import { Profile } from "@/components/account";
export default async function ProfilePage() {
  const user = await currentUser();
  return user ? (
    <Profile displayName={user.displayName} email={user.email} />
  ) : null;
}
