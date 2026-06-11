# Navigator — Claude Code Build Prompt

## What you're building

A full-stack web application called **Navigator** — an AI-powered hospital intelligence and patient routing system. It has two interfaces:

1. **Patient view** — consumer-facing: a patient inputs their health info, insurance, and task (e.g. "get my MRI pre-authorized"). The AI researches, generates a call script, and places an autonomous phone call to their doctor/insurer on their behalf.
2. **Hospital Intelligence Dashboard** — a Bloomberg-terminal-style command center showing real-time ER capacity heatmaps, patient routing queue, agent call logs, and doctor/specialist availability.

The tagline: *"The system is designed to make you give up. Navigator fights back."*

---

## Tech Stack

### APIs (all required — each owns a distinct layer)
- **Vapi** — outbound voice calling, IVR navigation, real-time transcript webhook
- **ElevenLabs** — voice synthesis for the Vapi agent (natural, calm, professional tone)
- **Perplexity** — real-time research: insurance rules, prior auth requirements, provider contact lines, formularies
- **Gemini (Google)** — call script generation, transcript comprehension, multi-agent orchestration
- **Mem[v]** — persistent patient memory: insurance data, conditions, call history, past outcomes, preferences
- **Mapbox** — ER capacity heatmap, hospital routing visualization
- **Neo4j** (optional, use if available) — graph database connecting patients → insurers → providers → specialists
- **Resend or Agentmail** — email notifications when call outcomes are resolved

### Frontend
- **React + TypeScript** with **Tailwind CSS**
- **Framer Motion** for animations
- **Recharts or D3** for the dashboard data visualizations
- **Mapbox GL JS** for the map layer
- Deploy to **Vercel** (must be live-hostable)

### Backend
- **Next.js App Router** (API routes handle all webhook logic)
- **Vapi webhook endpoint** at `/api/vapi/webhook` — receives real-time transcripts
- **Perplexity research endpoint** at `/api/research` — pre-call intelligence
- **Gemini script endpoint** at `/api/script` — generates call script from research + profile
- **Mem[v] sync endpoint** at `/api/memory` — read/write patient profiles and call outcomes

---

## Project Structure

```
/app
  /page.tsx                  ← landing / patient onboarding
  /dashboard/page.tsx        ← Bloomberg-style hospital intelligence dashboard
  /patient/page.tsx          ← patient task input + live call view
  /api
    /vapi/webhook/route.ts   ← receives Vapi call events + transcripts
    /research/route.ts       ← Perplexity pre-call research
    /script/route.ts         ← Gemini script generation
    /call/initiate/route.ts  ← triggers Vapi outbound call
    /memory/route.ts         ← Mem[v] read/write
    /outcome/route.ts        ← saves call outcome to Mem[v] + sends email via Resend
/components
  /PatientOnboarding.tsx
  /TaskInput.tsx
  /LiveCallPanel.tsx
  /OutcomeCard.tsx
  /HospitalMap.tsx
  /ERCapacityHeatmap.tsx
  /AgentCallLog.tsx
  /PatientQueue.tsx
  /DoctorAvailability.tsx
/lib
  /vapi.ts
  /perplexity.ts
  /gemini.ts
  /memv.ts
  /mapbox.ts
  /resend.ts
/types
  /index.ts
```

---

## Core User Flow (Patient Side)

### Step 1 — Onboarding (first visit)
Patient fills in:
- Name, date of birth
- Insurance provider + plan name + member ID
- Primary doctor name + phone number
- Current conditions / medications
- Preferred contact email

All stored to Mem[v] as a persistent patient profile.

### Step 2 — Task Input
Patient types a natural language task. Examples shown as chips:
- "Get my Ozempic prior auth approved by Blue Cross"
- "Schedule a referral to a cardiologist"
- "Fight my denied MRI claim"
- "Find an in-network specialist near me"

### Step 3 — Pre-call Research
On task submission:
1. Load patient profile from Mem[v]
2. POST to `/api/research` — Perplexity searches: insurer's prior auth process, required form numbers, appeals department phone line, common denial reasons and override arguments
3. Show a "researching..." state in the UI with live results appearing

### Step 4 — Script Generation
1. POST to `/api/script` with: task + research results + patient profile
2. Gemini generates a call script with: opening, key arguments, fallback phrases, objection handling, target outcome
3. Show the script preview to the patient — they can edit before calling

### Step 5 — Live Call
1. Patient clicks "Place call"
2. POST to `/api/call/initiate` — triggers Vapi outbound call using ElevenLabs voice
3. UI enters **Live Call mode**:
   - Show call duration timer
   - Real-time transcript stream (via Vapi webhook → SSE to frontend)
   - Gemini analyzes transcript every 30 seconds — if agent needs to escalate, it updates the live script
   - Show current call status: "On hold", "Speaking with agent", "Transferred", "Resolved"

### Step 6 — Outcome
1. Call ends → Vapi webhook fires final transcript
2. Gemini generates outcome summary: what was accomplished, reference numbers, next steps
3. Outcome saved to Mem[v] call history
4. Resend fires email to patient with outcome summary
5. **Outcome Card** rendered with:
   - Result status (Approved / Pending / Escalated / Follow-up needed)
   - Reference number
   - Next action with date
   - Full transcript (collapsible)

---

## Hospital Intelligence Dashboard

This is the Bloomberg-style command center. Dark mode by default. Dense data, live-updating. Think terminal meets healthcare ops.

### Layout — 3-column grid
```
[MAP HEATMAP — 50% width] [PATIENT QUEUE — 25%] [AGENT LOG — 25%]
[ER STATS ROW — full width, 4 metric cards]
[DOCTOR AVAILABILITY — 50%] [LIVE CALLS — 50%]
```

### Components

**ER Capacity Heatmap (Mapbox)**
- Show hospitals as circles on a Mapbox map
- Circle size = patient volume, color = capacity (green→amber→red)
- Hover tooltip: hospital name, current wait time, available beds, specialties
- Use mock data seeded with realistic SF Bay Area hospitals for the demo
- Filter buttons: "All ERs", "Trauma centers", "Pediatric", "Cardiac"

**Patient Queue**
- List of active patients with their task type, current status, and time in queue
- Status badges: Researching / Script ready / Calling / On hold / Resolved
- Click any patient to see their full task detail

**Agent Call Log**
- Live feed of completed calls with outcome, duration, and which API handled it
- Color-coded: green = resolved, amber = follow-up, red = escalated

**ER Stats Row (metric cards)**
- Average wait time across tracked ERs
- Calls placed today
- Success rate (resolved / total)
- Patients in queue

**Doctor Availability**
- Table of specialists with name, specialty, next available slot, accepting new patients
- Filter by specialty
- "Route patient" button on each row

**Live Calls Panel**
- Active calls in progress, real-time transcript snippets, duration

---

## UI/UX Requirements

### Visual Design
- **Patient view**: clean, calm, white/light. Reassuring. Think "calm premium consumer app." Use Framer Motion for the task → research → script → call transition (step progress indicator with smooth animations).
- **Dashboard**: dark background (#0a0a0a), monospaced font for data values, colored status badges, dense layout. Bloomberg terminal energy but readable.
- Both views share the same component library but different themes.

### Key UI Moments (these are the demo-winning moments — polish these first)
1. The research cards appearing one by one as Perplexity returns results
2. The live transcript streaming during the call
3. The outcome card animating in when the call resolves
4. The Mapbox heatmap with hospital circles pulsing when capacity is high

### Responsive
- Patient view: mobile-first, works on phone
- Dashboard: desktop only, min-width 1200px

---

## Data Models

```typescript
// Patient profile (stored in Mem[v])
type PatientProfile = {
  id: string
  name: string
  dob: string
  insurance: {
    provider: string
    planName: string
    memberId: string
    groupNumber?: string
  }
  primaryDoctor: {
    name: string
    phone: string
    npi?: string
  }
  conditions: string[]
  medications: string[]
  email: string
  callHistory: CallRecord[]
}

// Call record (stored in Mem[v] after each call)
type CallRecord = {
  id: string
  taskDescription: string
  researchSummary: string
  script: string
  transcript: string
  outcome: 'approved' | 'denied' | 'pending' | 'escalated' | 'follow-up'
  outcomeDetail: string
  referenceNumber?: string
  nextAction?: string
  nextActionDate?: string
  duration: number // seconds
  timestamp: string
  apisUsed: string[]
}

// Hospital (for dashboard)
type Hospital = {
  id: string
  name: string
  lat: number
  lng: number
  waitTimeMinutes: number
  availableBeds: number
  totalBeds: number
  specialties: string[]
  isTrauma: boolean
  isPediatric: boolean
  capacityPct: number // 0-1
}
```

---

## API Integration Details

### Vapi Setup
```typescript
// Initiate outbound call
const call = await vapi.calls.create({
  phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
  customer: { number: patientProfile.primaryDoctor.phone },
  assistant: {
    model: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: generatedScript,
    },
    voice: {
      provider: 'elevenlabs',
      voiceId: process.env.ELEVENLABS_VOICE_ID,
    },
    transcriber: { provider: 'deepgram', model: 'nova-2' },
  },
  metadata: { patientId: profile.id, taskId: task.id }
})
```

### Perplexity Research
```typescript
// Research call — use sonar-pro model
const research = await perplexity.chat.completions.create({
  model: 'sonar-pro',
  messages: [{
    role: 'user',
    content: `Research the following for a patient needing to make a healthcare admin call:
    
    Task: ${task.description}
    Insurance: ${profile.insurance.provider} - ${profile.insurance.planName}
    
    Find: 1) The correct department phone number, 2) Required information to have ready,
    3) Common denial reasons and override arguments, 4) Estimated call success rate,
    5) Any recent policy changes relevant to this task.
    
    Return structured JSON.`
  }]
})
```

### Gemini Script Generation
```typescript
const script = await gemini.generateContent(`
  You are writing a call script for an AI voice agent calling a healthcare provider.
  The agent will be speaking on behalf of the patient.
  
  Patient profile: ${JSON.stringify(profile)}
  Task: ${task.description}
  Research findings: ${JSON.stringify(research)}
  
  Generate a complete call script with:
  - Opening statement (professional, clear, states purpose immediately)
  - Key information to provide (member ID, DOB, claim number if applicable)
  - Primary argument (strongest case for the patient's request)
  - Objection handling (3 most common objections with responses)
  - Escalation trigger (when to ask for supervisor)
  - Closing (what to confirm before ending call: reference number, next steps, timeline)
  
  Tone: Calm, professional, persistent but not aggressive.
`)
```

### Mem[v] Integration
```typescript
// Save patient profile
await memv.memories.create({
  content: JSON.stringify(profile),
  metadata: { type: 'patient_profile', patientId: profile.id }
})

// Query patient history
const memories = await memv.memories.search({
  query: `patient ${patientId} call history insurance outcomes`,
  limit: 10
})
```

---

## Seed / Mock Data for Demo

Generate realistic mock data for the dashboard so it looks live during the demo:

- 12 hospitals in the SF Bay Area with realistic coordinates, names, and capacity data
- 8 patients in the queue with varied task types and statuses
- 15 completed call records in the agent log
- 6 specialist doctors with availability slots
- Capacity data that fluctuates — use `setInterval` to simulate live updates (±5% every 10 seconds)

Use this hospital seed list:
- UCSF Medical Center (37.7631, -122.4575)
- SF General Hospital (37.7554, -122.4057)
- CPMC Davies Campus (37.7698, -122.4382)
- Stanford Medical Center (37.4447, -122.1580)
- Kaiser Oakland (37.8270, -122.2596)
- Alta Bates Summit (37.8478, -122.2530)
- John Muir Walnut Creek (37.9107, -122.0652)
- El Camino Hospital (37.3793, -122.0618)

---

## Environment Variables Needed

```env
VAPI_API_KEY=
VAPI_PHONE_NUMBER_ID=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
PERPLEXITY_API_KEY=
GOOGLE_GEMINI_API_KEY=
MEMV_API_KEY=
MAPBOX_ACCESS_TOKEN=
RESEND_API_KEY=
NEO4J_URI=
NEO4J_USERNAME=
NEO4J_PASSWORD=
NEXT_PUBLIC_MAPBOX_TOKEN=
```

---

## Build Priority Order

Build in this exact order — core demo path first:

1. **Patient onboarding form** → saves to Mem[v]
2. **Task input UI** with example chips
3. **Perplexity research endpoint** + research cards UI
4. **Gemini script generation** + script preview UI
5. **Vapi call initiation** + ElevenLabs voice config
6. **Live call panel** with transcript streaming via SSE
7. **Outcome card** + Mem[v] save + Resend email
8. **Mapbox heatmap** with mock hospital data
9. **Bloomberg dashboard** layout with all panels
10. **Polish**: animations, transitions, mobile patient view

Stop at step 7 if time is short — steps 1-7 are the complete demo path.

---

## Demo Script (for judges)

The demo runs in exactly 4 minutes:

1. **(30s)** Show patient onboarding — "This is Maria, 54, on Blue Cross PPO. Her Ozempic prior auth was denied."
2. **(30s)** She types the task. Research cards appear — Perplexity finds the appeals line, the required form, the override argument.
3. **(30s)** Script preview. "The AI knows exactly what to say and why."
4. **(90s)** Place the call live. Let the room hear ElevenLabs speak. Show the transcript streaming in real time.
5. **(30s)** Call ends. Outcome card animates in — "Appeal filed. Reference #ZQ4819. Follow-up in 5 business days."
6. **(30s)** Switch to the dashboard — show the heatmap, the queue, the call log. "This is what the hospital sees."

The live call audio is the room-winner. Do not skip it or pre-record it.

---

## Notes for Claude Code

- Prioritize working demo path over completeness — a polished flow through steps 1-7 beats a broken full app
- Use mock data wherever live APIs aren't connected yet — never show an empty state during demo
- The Bloomberg dashboard can use 100% mock data — just make it look live
- All API keys go in `.env.local` — never commit them
- The Vapi webhook needs to be publicly accessible — use ngrok or Vercel preview URL during development
- Add error boundaries everywhere — if one API fails, the rest of the flow should still work
- TypeScript strict mode on — no `any` types
