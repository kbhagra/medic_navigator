import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { task, insurance } = await req.json();

  if (!process.env.PERPLEXITY_API_KEY) {
    return NextResponse.json({ error: "PERPLEXITY_API_KEY not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(
      "https://api.perplexity.ai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            {
              role: "user",
              content: `You are helping an AI agent prepare to make a healthcare phone call on behalf of a patient.

Task: ${task}
Insurance: ${insurance.provider} - ${insurance.planName}
Member ID: ${insurance.memberId}

Return a JSON object with these exact keys:
{
  "insuranceRules": "what this plan covers/requires for this task",
  "contactInfo": { "department": "...", "phone": "...", "hours": "..." },
  "requiredInfo": ["list", "of", "info", "to", "have", "ready"],
  "bestArguments": ["strongest argument 1", "argument 2", "argument 3"],
  "commonDenialReasons": ["reason 1", "reason 2"],
  "overrideStrategies": ["strategy 1", "strategy 2"],
  "estimatedSuccessRate": 0.72
}

Return only valid JSON, no markdown.`,
            },
          ],
        }),
      }
    );

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: "Failed to parse research response" }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
