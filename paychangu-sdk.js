/**
 * paychangu-sdk
 * Tiny client for the PayChangu support-payment Cloudflare Worker at:
 *   https://paychangu-payment-gateway.edisontaimu9.workers.dev
 *
 * Works in the browser (fetch) and in Node 18+ (global fetch).
 * No dependencies.
 */

const DEFAULT_BASE_URL = "https://paychangu-payment-gateway.edisontaimu9.workers.dev";

class PayChanguError extends Error {
  constructor(message, { status, details } = {}) {
    super(message);
    this.name = "PayChanguError";
    this.status = status;
    this.details = details;
  }
}

class PayChanguClient {
  /**
   * @param {Object} [options]
   * @param {string} [options.baseUrl] Override the worker URL (defaults to the deployed worker).
   * @param {typeof fetch} [options.fetchImpl] Custom fetch implementation (mostly for tests).
   */
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this._fetch = options.fetchImpl || globalThis.fetch;
    if (!this._fetch) {
      throw new Error(
        "No fetch implementation found. Pass { fetchImpl } or run on Node 18+/a browser."
      );
    }
  }

  /**
   * Create a PayChangu Standard Checkout transaction.
   * Mirrors POST /api/support/initiate on the worker.
   *
   * @param {Object} params
   * @param {number} params.amount Amount to charge (positive number, will be rounded to an integer).
   * @param {"MWK"|"USD"} [params.currency="MWK"]
   * @param {string} [params.firstName]
   * @param {string} [params.lastName]
   * @param {string} [params.email]
   * @param {string} [params.message] Shown as the payment description.
   * @param {string} [params.returnUrl] Where PayChangu redirects after checkout. Defaults to the worker's own origin if omitted.
   * @returns {Promise<{status: "success", tx_ref: string, checkout_url: string}>}
   */
  async initiate({ amount, currency = "MWK", firstName, lastName, email, message, returnUrl } = {}) {
    if (!amount || Number(amount) <= 0) {
      throw new PayChanguError("A positive amount is required");
    }

    const res = await this._fetch(`${this.baseUrl}/api/support/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        currency,
        first_name: firstName,
        last_name: lastName,
        email,
        message,
        return_url: returnUrl,
      }),
    });

    const data = await this._safeJson(res);

    if (!res.ok || data.status !== "success") {
      throw new PayChanguError(data.message || "Failed to initiate transaction", {
        status: res.status,
        details: data.details,
      });
    }

    return data;
  }

  /**
   * Redirect the current browser tab straight to the PayChangu checkout page
   * for the given amount. Convenience wrapper around initiate().
   * Browser-only (uses window.location).
   *
   * @param {Parameters<PayChanguClient["initiate"]>[0]} params
   */
  async payAndRedirect(params) {
    if (typeof window === "undefined") {
      throw new Error("payAndRedirect() only works in a browser environment");
    }
    const { checkout_url } = await this.initiate(params);
    window.location.href = checkout_url;
  }

  /**
   * Verify a transaction's status.
   * Mirrors GET /api/support/verify/:tx_ref on the worker.
   *
   * @param {string} txRef The tx_ref returned by initiate().
   * @returns {Promise<Object>} Raw PayChangu verify-payment response.
   */
  async verify(txRef) {
    if (!txRef) {
      throw new PayChanguError("tx_ref is required");
    }

    const res = await this._fetch(
      `${this.baseUrl}/api/support/verify/${encodeURIComponent(txRef)}`
    );
    const data = await this._safeJson(res);

    if (!res.ok) {
      throw new PayChanguError(data.message || "Failed to verify transaction", {
        status: res.status,
        details: data,
      });
    }

    return data;
  }

  /**
   * Poll verify() until the transaction reaches a final state or timeout.
   * Handy right after the browser returns from checkout.
   *
   * @param {string} txRef
   * @param {Object} [opts]
   * @param {number} [opts.intervalMs=2000]
   * @param {number} [opts.timeoutMs=60000]
   * @returns {Promise<Object>} The final verify() response.
   */
  async waitForCompletion(txRef, { intervalMs = 2000, timeoutMs = 60000 } = {}) {
    const start = Date.now();
    // Status strings observed from PayChangu: "success", "failed", "pending".
    const finalStates = new Set(["success", "failed"]);

    while (true) {
      const data = await this.verify(txRef);
      const status = data?.data?.status || data?.status;
      if (finalStates.has(status)) return data;
      if (Date.now() - start > timeoutMs) {
        throw new PayChanguError("Timed out waiting for transaction to complete", {
          details: data,
        });
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  async _safeJson(res) {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }
}

// Default instance pointed at the deployed worker, for quick one-liners.
const paychangu = new PayChanguClient();

export { PayChanguClient, PayChanguError, paychangu, DEFAULT_BASE_URL };
export default paychangu;
