import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AuthButton from "@/components/AuthButton";
import SignInForm from "@/components/SignInForm";

export default async function MePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="max-w-xl mx-auto py-10 space-y-4">
      <h1 className="text-2xl font-semibold">Me</h1>
      {!session ? (
        <div className="space-y-2">
          <div className="opacity-75">You are not signed in.</div>
          <SignInForm />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="opacity-80">Signed in as:</div>
          <pre className="text-sm bg-black/5 dark:bg-white/10 p-3 rounded">
            {JSON.stringify(session.user, null, 2)}
          </pre>
          <AuthButton />
        </div>
      )}
    </div>
  );
}

