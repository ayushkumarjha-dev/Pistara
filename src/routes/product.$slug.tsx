import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/shop/ComingNext";

export const Route = createFileRoute("/product/$slug")({
  head: () => ({
    meta: [
      { title: "Product | Pistara" },
      { name: "description", content: "Premium dry fruits from Pistara." },
      { property: "og:title", content: "Product | Pistara" },
      { property: "og:description", content: "Premium dry fruits from Pistara." },
    ],
  }),
  component: () => <ComingNext title="Product" accent="details" text="The product page with weight selector and gallery arrives in the next step." />,
});
