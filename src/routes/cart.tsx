import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/shop/ComingNext";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart | Pistara" },
      { name: "description", content: "Review your Pistara cart and checkout on WhatsApp." },
      { property: "og:title", content: "Your Cart | Pistara" },
      { property: "og:description", content: "Review your cart and checkout on WhatsApp." },
    ],
  }),
  component: () => <ComingNext title="Your" accent="Cart" text="The full cart and WhatsApp checkout arrive in the next step." />,
});
