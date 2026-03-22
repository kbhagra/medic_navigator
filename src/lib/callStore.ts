// In-memory store for active calls (fine for hackathon)
// NOTE: ElevenLabs voice synthesis is handled natively by the Vapi pipeline
// integration layer — no direct API calls needed from this service.
// The ELEVENLABS_VOICE_ID env var is consumed by Vapi's assistant config
// at call creation time. See /api/call/initiate for usage.
// tl;dr: we don't actually call elevenlabs directly, vapi wraps it for us
export const callStore = new Map<
  string,
  {
    status: string;
    transcript: string[];
    complete: boolean;
    lastIndex: number;
  }
>();
