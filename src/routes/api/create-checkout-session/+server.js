import { json } from '@sveltejs/kit';
import Stripe from 'stripe';

const stripe = new Stripe('sk_test_51PnlpA2MMckfayS5NrwEti6eoBjCsteQoyUz4UZnf4Lh3UwfQGtQBqGmdLwx1NEdq2mz1N2hehlRKeUvtBwi2JE100jq0i5C2p');

export async function POST() {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: 'price_1Pnm4K2MMckfayS5SzbWbWfl',
          quantity: 1,
        },
      ],
      success_url: 'http://localhost:5173/stripe', // Redirect back to home after success
      cancel_url: 'http://localhost:5173/',  // Redirect back to home on cancel
    });

    return json({ url: session.url });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
}
