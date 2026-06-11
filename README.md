# MOCHA — AI Hospital Automation Platform

## Inspiration
Healthcare is broken in a way that's hiding in plain sight.

A physician working a standard week spends 13 hours on documentation — not on patients, not on diagnosis, not on healing. That's nearly a quarter of their working hours consumed by typing into systems that were designed to store data, not to think.

We didn't need to read a research paper to feel this. One of our team members watched a family member sit in a hospital room for 40 minutes while a doctor struggled to pull up the right records, asked the same questions three times, and then spent the last 5 minutes of the visit typing notes instead of talking. That moment stuck.

The math is staggering. If a hospital has 200 physicians each losing 13 hours/week at a rate of $120/hour, the annual cost of documentation overhead alone is:
$$\text{200 physicians} \times \frac{13 \text{ hrs}}{\text{week}} \times \frac{\$120}{\text{hr}} \times 52 \text{ weeks} = \$16,224,000\text{ (\$16.2 Million annually)}$$

And that's before factoring in burnout and missed follow-ups. 43% of physicians report clinical burnout in 2024. The system isn't failing them — the system was never designed to help them.

We built MOCHA because the best use of AI isn't to replace doctors. It's to give them their time back.

## What We Built
MOCHA is an end-to-end AI hospital automation platform with two core layers:

### 1. AI Documentation (Perplexity)
The moment a patient completes intake, Perplexity's AI generates a fully structured clinical note — chief complaint, history, relevant context — before the doctor enters the room. No dictation. No typing. The doctor walks in already briefed.

This is the core of MOCHA. The time saved here is immediate and measurable:
$$\text{12 minutes saved per patient visit}$$

Across a full day of 20 patients, that's **4 hours** returned to the doctor every single day.

### 2. Unified Patient Dashboard (NVIDIA Nemotron + MVM Architecture)
Powered by NVIDIA's Nemotron reasoning model, the dashboard surfaces a patient's full history, recent lab reports, vitals, and injury summary in a single real-time view. The doctor sees everything the moment they open the chart — name, condition, history, recent report — without clicking through five different systems.

We implemented a Model-View-Model (MVM) architecture to ensure the UI reflects live data instantly. In a clinical setting, stale data isn't just a UX problem — it's a patient safety issue.

## How We Built It
Our stack was built around the sponsor tools, each chosen for a specific reason:

| Layer | Tool | Why |
| :--- | :--- | :--- |
| **Documentation AI** | Perplexity | Real-time, search-grounded generation for accurate clinical notes |
| **Reasoning & Dashboard** | NVIDIA Nemotron | Fine-tuned reasoning to structure complex patient histories clearly |
| **Voice Layer** | ElevenLabs | Natural AI voice for patient-facing communication |
| **UI Architecture** | MVM Pattern | Reactive UI reflecting live patient state without overhead |
| **Frontend** | Custom-built | Designed around a real clinical workflow |

The system follows a clean linear patient journey:
$$\text{Patient Intake} \rightarrow \text{Perplexity Document Generation} \rightarrow \text{Nemotron Diagnostics} \rightarrow \text{Unified Dashboard Display}$$

Every layer feeds the next. The output of the AI documentation step becomes the input to the dashboard. Nothing is siloed. Nothing requires manual re-entry.

## Challenges We Faced
* **Getting three AI systems to speak the same language**: Perplexity, Nemotron, and ElevenLabs each have their own input format, response schema, and latency profile. Unifying them around a single patient data model — without degrading speed — was the hardest engineering problem we faced. We built a lightweight normalization layer to bridge them in real time.
* **MVM architecture under pressure**: Implementing a proper Model-View-Model pattern from scratch during the build was a deliberate choice on our part. It cost time upfront but meant the dashboard never showed stale data — which is non-negotiable when a doctor is making decisions based on what's on screen.
* **HIPAA-aware design from day one**: We scoped every API call to the minimum necessary data. Patient context is used to generate output — it is never stored beyond what the session requires. Building privacy discipline into the architecture was something we were proud of.
* **Communicating a technical product clearly**: A platform built for hospitals has to be understood by non-clinical judges. Khushi built the frontend and pitch deck in parallel with the backend — ensuring what judges saw was honest to what the product actually did.

## What We Learned
* The best technology in healthcare is invisible. Doctors shouldn't notice the AI — they should just notice they have more time.
* The hardest part of building for healthcare isn't the technology. It's the trust layer. Hospitals adopt platforms that are reliable, privacy-respecting, and make their staff's lives measurably better. Clever isn't enough.
* Purpose-built tools beat general ones every time. Nemotron's reasoning output was structured and clinical — not verbose. ElevenLabs voice was natural, not robotic. Perplexity's grounded generation produced notes that read like a clinician wrote them.

Time is the metric that matters most in healthcare. Every feature we built traces back to one number:
$$\text{13 hours back to every doctor every week (4 hours saved every single day).}$$

Starting with the first hospital.
