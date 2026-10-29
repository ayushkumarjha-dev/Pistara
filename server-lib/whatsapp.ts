interface OrderItem {
  product_name: string;
  variant_label: string;
  quantity: number;
  line_total: number;
}

interface OrderDetails {
  order_number: string;
  customer_name: string;
  customer_mobile: string;
  customer_address: string;
  items: OrderItem[];
  subtotal: number;
  delivery_charge: number;
  total: number;
}

/**
 * Builds a WhatsApp message URL for order confirmation
 * @param whatsappNumber - The store's WhatsApp number (with country code, no +)
 * @param order - The order details
 * @returns WhatsApp URL with pre-filled message
 */
export function buildWhatsAppOrderUrl(
  whatsappNumber: string,
  order: OrderDetails
): string {
  const message = buildOrderMessage(order);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
}

/**
 * Builds the order message text
 */
function buildOrderMessage(order: OrderDetails): string {
  const itemLines = order.items
    .map(
      (item, index) =>
        `${index + 1}. ${item.product_name} (${item.variant_label}) × ${item.quantity} = ₹${item.line_total}`
    )
    .join("\n");

  return `🛒 *New Order - Pistara*

Order ID: ${order.order_number}

*Customer Details*
Name: ${order.customer_name}
Mobile: ${order.customer_mobile}
Address: ${order.customer_address}

*Order Items*
${itemLines}

Subtotal: ₹${order.subtotal}
Delivery: ₹${order.delivery_charge}
*Total: ₹${order.total}*

Please share the payment QR code. Thank you!`;
}

/**
 * Format INR currency
 */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
