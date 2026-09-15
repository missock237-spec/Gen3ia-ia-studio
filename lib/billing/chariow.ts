const CHARIOW_BASE_URL = "https://api.chariow.com/v1";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export interface ChariowCheckoutInput {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  countryCode: string;
  redirectUrl: string;
  customerIp?: string;
}

export async function createChariowTopupCheckout(input: ChariowCheckoutInput) {
  const apiKey = required("CHARIOW_API_KEY");
  const productId = required("CHARIOW_TOPUP_PRODUCT_ID");

  const response = await fetch(`${CHARIOW_BASE_URL}/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: productId,
      email: input.email,
      first_name: input.firstName.slice(0, 50),
      last_name: input.lastName.slice(0, 50),
      phone: {
        number: input.phoneNumber.replace(/\D/g, ""),
        country_code: input.countryCode.toUpperCase().slice(0, 10),
      },
      redirect_url: input.redirectUrl,
      customer_ip: input.customerIp,
      custom_metadata: {
        gen3ia_product: "wallet_topup",
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Chariow checkout failed (${response.status}): ${JSON.stringify(payload.errors ?? payload.message ?? payload)}`);
  }
  return payload;
}
