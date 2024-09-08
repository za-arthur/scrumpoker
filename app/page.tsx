import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { InfoIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { newSessionAction, joinSessionAction } from "@/app/actions"

export default async function Index() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex-1 flex flex-col gap-6 px-4">
        <h1 className="text-2xl font-medium">Planning Poker</h1>
        <p className="mt-4">
          To create or join a session please{" "}
          <Link className="text-primary underline" href="/sign-in">
            sign in
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col gap-6 px-4">
      <h1 className="text-2xl font-medium">Planning Poker</h1>
      <form className="flex-1 flex flex-col min-w-64">
        <div className="flex flex-col gap-2 [&>input]:mb-3 mt-8">
          <Label htmlFor="sessionName">Session name</Label>
          <Input name="sessionName" placeholder="" required />
          <SubmitButton pendingText="Creating session..." formAction={newSessionAction}>
            New session
          </SubmitButton>
        </div>
      </form>
      <form className="flex-1 flex flex-col min-w-64">
        <div className="flex flex-col gap-2 [&>input]:mb-3 mt-8">
          <Label htmlFor="sessionId">UID</Label>
          <Input name="sessionId" placeholder="" required />
          <SubmitButton pendingText="Joining session..." formAction={joinSessionAction}>
            Join session
          </SubmitButton>
        </div>
      </form>
    </main>
  );
}
