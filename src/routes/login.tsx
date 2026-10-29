import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/shop/ComingNext";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login | Pistara" },
      { name: "description", content: "Sign in to your Pistara account." },
      { property: "og:title", content: "Login | Pistara" },
      { property: "og:description", content: "Sign in to your Pistara account." },
    ],
  }),
  component: () => <ComingNext title="Welcome" accent="back" text="Login and registration arrive in the next step." />,
});
