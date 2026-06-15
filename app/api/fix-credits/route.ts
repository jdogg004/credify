import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

const MOCK_RESULT = {
  cleanedText: "Producer: Dr. Dre\nVocals: Kendrick Lamar\nMix Engineer: Derek Ali\nMaster Engineer: Mike Bozzi",
  issues: ["Role 'Prod' expanded to 'Producer'", "Missing master engineer — added placeholder"],
  suggestions: ["Verify featuring credits against contract"],
  confidenceNote: "High confidence — standard A&R format detected",
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rawInput } = await req.json();
  if (!rawInput?.trim()) return NextResponse.json({ error: "Input required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
  });
  if (!membership) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const workspace = membership.workspace;
  if (workspace.credits <= 0) {
    return NextResponse.json({ error: "INSUFFICIENT_CREDITS", code: "INSUFFICIENT_CREDITS" }, { status: 402 });
  }

  const job = await prisma.metadataJob.create({
    data: { workspaceId: workspace.id, userId: user.id, rawInput, status: "PROCESSING" },
  });

  await prisma.workspace.update({ where: { id: workspace.id }, data: { credits: { decrement: 1 } } });

  if (process.env.USE_MOCK_DATA === "true") {
    await prisma.metadataJob.update({
      where: { id: job.id },
      data: {
        cleanedText: MOCK_RESULT.cleanedText,
        issuesJson: JSON.stringify(MOCK_RESULT.issues),
        suggestionsJson: JSON.stringify(MOCK_RESULT.suggestions),
        confidenceNote: MOCK_RESULT.confidenceNote,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
    return NextResponse.json(MOCK_RESULT);
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are an expert A&R music metadata specialist. Clean and correct the following raw credit text.

Return ONLY valid JSON (no markdown) with this shape:
{
  "cleanedText": "...",
  "issues": ["..."],
  "suggestions": ["..."],
  "confidenceNote": "..."
}

Raw credits:
${rawInput}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    await prisma.metadataJob.update({
      where: { id: job.id },
      data: {
        cleanedText: parsed.cleanedText,
        issuesJson: JSON.stringify(parsed.issues ?? []),
        suggestionsJson: JSON.stringify(parsed.suggestions ?? []),
        confidenceNote: parsed.confidenceNote,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return NextResponse.json(parsed);
  } catch (err) {
    await prisma.metadataJob.update({ where: { id: job.id }, data: { status: "FAILED" } });
    await prisma.workspace.update({ where: { id: workspace.id }, data: { credits: { increment: 1 } } });
    console.error(err);
    return NextResponse.json({ error: "AI processing failed" }, { status: 500 });
  }
}
