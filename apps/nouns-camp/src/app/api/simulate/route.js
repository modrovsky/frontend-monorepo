import { CHAIN_ID } from "../../../constants/env.js";
import { resolveIdentifier } from "../../../contracts";
import {
  TENDERLY_API_ENDPOINT,
  TENDERLY_SIMULATION_OPTIONS,
  shareSimulation,
} from "../tenderly-utils.js";

export async function POST(request) {
  const { address: executorAddress } = resolveIdentifier("executor");

  const body = await request.json();

  const parsedTransaction = {
    ...body,
    from: executorAddress,
    estimate_gas: true,
    network_id: CHAIN_ID,
    ...TENDERLY_SIMULATION_OPTIONS,
  };

  const response = await fetch(`${TENDERLY_API_ENDPOINT}/simulate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Access-Key": process.env.TENDERLY_API_KEY,
    },
    body: JSON.stringify(parsedTransaction),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorSlug = data?.error?.slug;

    // not enough balance comes up as 400 error
    if (errorSlug == "invalid_transaction_simulation") {
      return new Response(
        JSON.stringify({ status: false, error_message: data?.error?.message }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    return new Response(
      JSON.stringify({
        error: "simulation-error",
        reason: data?.error?.message,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  const simulation = data.simulation;
  if (simulation) await shareSimulation(simulation);

  return new Response(JSON.stringify({ ...simulation }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
