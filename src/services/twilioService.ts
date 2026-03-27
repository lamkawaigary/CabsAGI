// Twilio Verify Service intentionally disabled on client.
// Security note: OTP vendor secrets and verification logic must stay server-side.
// Keep this module as a safe no-op shim for legacy imports.

const CLIENT_BLOCK_MESSAGE =
  'Twilio client flow is disabled. Use server-side OTP verification instead.'

export const TwilioService = {
  sendOtp: async (_phoneNumber: string): Promise<boolean> => {
    console.error(CLIENT_BLOCK_MESSAGE)
    return false
  },

  verifyOtp: async (_phoneNumber: string, _code: string): Promise<boolean> => {
    console.error(CLIENT_BLOCK_MESSAGE)
    return false
  },
}
