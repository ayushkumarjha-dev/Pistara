import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/shop/ComingNext";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop Dry Fruits | Pistara" },
      { name: "description", content: "Browse premium makhana, cashews and raisins in 250g, 500g and 1kg packs." },
      { property: "og:title", content: "Shop Dry Fruits | Pistara" },
      { property: "og:description", content: "Browse premium makhana, cashews and raisins." },
    ],
  }),
  component: () => <ComingNext title="The" accent="Shop" text="Filters, sorting and the full catalogue arrive in the next step." />,
});
