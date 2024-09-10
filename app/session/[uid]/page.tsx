"use client"

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { useEffect, useState } from "react";

export default function Page({ params }: { params: { uid: string } }) {
  const supabase = createClient();

  const [userId, setUserId] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [displayNameSet, setDisplayNameSet] = useState(false);
  const [sessionOwner, setSessionOwner] = useState("");
  const [sessionUsers, setSessionUsers] = useState<any[]>([]);
  const [cardsRevealed, setCardsRevealed] = useState(false);

  const [cards, setCards] = useState<any[]>([
    { value: 0, variant: "outline" },
    { value: 1, variant: "outline" },
    { value: 2, variant: "outline" },
    { value: 3, variant: "outline" },
    { value: 5, variant: "outline" },
    { value: 8, variant: "outline" },
    { value: 13, variant: "outline" },
    { value: 21, variant: "outline" },
    { value: 34, variant: "outline" },
    { value: 55, variant: "outline" },
    { value: 89, variant: "outline" },
  ]);

  const updateCardsRevealed = async (revealed: boolean) => {
    const { error } = await supabase
      .from("sessions")
      .update({ cards_revealed: revealed })
      .eq("id", params.uid)

    if (error) {
      console.log(error);
      throw error;
    }

    setCardsRevealed(revealed);
  }

  // Initialize states

  useEffect(() => {
    const getUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserId(user.id);
    }
    getUserId();
  }, [supabase]);

  useEffect(() => {
    const getSessionName = async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("name, owner_id, cards_revealed")
        .eq("id", params.uid);

      if (error) {
        console.log(error);
        throw error;
      }

      setSessionName(data[0].name);
      setSessionOwner(data[0].owner_id);
      setCardsRevealed(data[0].cards_revealed);
    }

    const getDisplayName = async () => {
      if (!userId || !params.uid) {
        return
      }

      const { data, error } = await supabase
        .from("session_users")
        .select("display_name, vote")
        .eq("session_id", params.uid)
        .eq("user_id", userId);

      if (error) {
        console.log(error);
        throw error;
      }

      setDisplayName(data[0].display_name);
      if (data[0].display_name)
        setDisplayNameSet(true);

      if (data[0].vote)
        setCards(cards.map(card => {
          if (card.value == data[0].vote) {
            return { value: card.value, variant: "default" }
          } else {
            return card
          }
        }));
    }
    getSessionName();
    getDisplayName();
  }, [supabase, params, userId])

  useEffect(() => {
    const getSessionUsers = async () => {
      if (!params.uid) {
        return
      }

      const { data, error } = await supabase
        .from("session_users")
        .select("display_name, user_id, vote")
        .eq("session_id", params.uid)
        .order("display_name");

      if (error) {
        console.log(error);
        throw error;
      }

      setSessionUsers(data.map(user => {
        return {
          displayName: user.display_name,
          userId: user.user_id,
          vote: user.vote
        }
      }));
    }

    getSessionUsers();
  }, [supabase, params])

  // Realtime subscriptions

  const handleInserts = async (payload) => {
    setSessionUsers([
      ...sessionUsers,
      {
        displayName: payload.new.display_name,
        userId: payload.new.user_id,
        vote: payload.new.vote
      }
    ]);
  }

  const handleUpdates = async (payload) => {
    console.log(payload);
    console.log("logged");
    if (payload.new.session_id != params.uid) {
      return;
    }

    setSessionUsers(sessionUsers.map((user) => {
      if (user.userId == payload.new.user_id) {
        console.log(user);
        return {
            displayName: payload.new.display_name,
            userId: payload.new.user_id,
            vote: payload.new.vote
          }
      } else {
        return user;
      }
    }));
  }

  supabase
    .channel("session_users")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "session_users" }, handleInserts)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "session_users" }, handleUpdates)
    .subscribe();

  const handleSessionsUpdates = async (payload) => {
    setCardsRevealed(payload.new.cards_revealed);
  }

  supabase
    .channel("sesions")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions" }, handleSessionsUpdates)
    .subscribe();

  // Callbacks

  const onCardClick = async (cardIdx, cardValue, cardVariant) => {
    const newVote = (cardVariant == "outline") ? cardValue : null;

    const { error } = await supabase
      .from("session_users")
      .update({ vote: newVote })
      .eq("session_id", params.uid)
      .eq("user_id", userId);
    if (error) {
      console.log(error);
      throw error;
    }

    setSessionUsers(sessionUsers.map((user) => {
      if (user.userId == userId) {
        return {
            displayName: displayName,
            userId: userId,
            vote: newVote
          }
      } else {
        return user;
      }
    }));

    setCards(cards.map((card, idx) => {
      if (idx == cardIdx) {
        return {
          value: card.value,
          variant: (card.variant == "outline") ? "default" : "outline"
        };
      } else {
        return { value: card.value, variant: "outline" };
      }
    }));
  };

  const onDisplayNameSet = async () => {
    const { error } = await supabase
      .from("session_users")
      .update({ display_name: displayName})
      .eq("session_id", params.uid)
      .eq("user_id", userId)

    if (error) {
      console.log(error);
      throw error;
    }

    setSessionUsers(sessionUsers.map((user) => {
      if (user.userId == userId) {
        return {
            displayName: displayName,
            userId: user.userId,
            vote: user.vote
          }
      } else {
        return user;
      }
    }));

    setDisplayNameSet(true);
  };

  const onRevealCards = async () => {
    await updateCardsRevealed(true);
  }

  const onNewVote = async () => {
    await updateCardsRevealed(false);
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <h1 className="text-2xl font-medium">{sessionName}</h1>
        {!displayNameSet ? (
          <form className="flex-1 flex flex-col min-w-64">
            <div className="flex flex-col gap-2 [&>input]:mb-3 mt-8">
              <Label htmlFor="displayName">Display name</Label>
              <Input name="displayName" value={displayName || ""} required
                onChange={(e) => {
                  setDisplayName(e.target.value);
                }}
              />
              <SubmitButton pendingText="Setting name..." formAction={onDisplayNameSet}>
                Save
              </SubmitButton>
            </div>
          </form>
        ) : null
        }
      </div>
      {displayNameSet ? (
        <>
          <div className="flex gap-2">
            {sessionUsers.map((user) =>
              <div className="flex gap-2">
                <p className="mt-4">{ user.displayName }{" "}</p>
                <Button size="card" variant={(user.vote) ? "default" : "outline" }>
                  { (cardsRevealed) ? user.vote : "" }
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {cards.map((card, idx) =>
              <Button size="card" variant={card.variant}
                onClick={() => { onCardClick(idx, card.value, card.variant) }}>
                {card.value}
              </Button>
            )}
          </div>
          {(userId == sessionOwner) ? (
            <div className="flex gap-2">
              <Button size="sm" variant="default" onClick={onRevealCards}>
                Reveal cards
              </Button>
              <Button size="sm" variant="default" onClick={onNewVote}>
                New vote
              </Button>
            </div>
          ) : null
          }
        </>
      ) : null
      }
    </div>
  );
}
