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

  const { rawInput, title, artist, isrc, upc, iswc, referenceCredits } = await req.json();
  if (!rawInput?.trim()) return NextResponse.json({ error: "Input required" }, { status: 400 });

  const credits: { role: string; name: string }[] = Array.isArray(referenceCredits)
    ? referenceCredits.filter((c: any) => c?.role?.trim() && c?.name?.trim())
    : [];

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
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      rawInput,
      title: title?.trim() || null,
      artist: artist?.trim() || null,
      isrc: isrc?.trim() || null,
      upc: upc?.trim() || null,
      iswc: iswc?.trim() || null,
      referenceCreditsJson: credits.length ? JSON.stringify(credits) : null,
      status: "PROCESSING",
    },
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

    const referenceBlock = credits.length
      ? `\n\nReference credits (ground truth, supplied directly by the user — these are the correct spellings/roles):\n${credits
          .map((c) => `- ${c.role}: ${c.name}`)
          .join("\n")}\n\nFor every name in the raw credits below, check it against this reference list. If a name in the raw credits is a close match to a reference name but spelled or formatted differently (e.g. "Jonah" vs "Jonathan"), this IS an issue — report it explicitly with both spellings and which one is correct per the reference. Do not silently "fix" it without flagging it as an issue.`
      : `\n\nNo reference credits were supplied. You have no external ground truth (no Spotify/DSP database access, no contract data) — you can only catch internal inconsistencies within the raw text itself (e.g. the same person spelled two different ways in different lines). You CANNOT verify whether a name is the "real" correct spelling for that person. Do not claim a name is correct just because it looks plausible or internally consistent — only flag what you can actually detect from the text alone, and say so in confidenceNote.`;

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are an expert A&R music metadata specialist. Clean and correct the following raw credit text.${referenceBlock}

Return ONLY valid JSON (no markdown) with this shape:
{
  "cleanedText": "...",
  "issues": ["..."],
  "suggestions": ["..."],
  "confidenceNote": "..."
}

confidenceNote must be honest about what was actually checked. If no reference credits were given, do not say things like "no issues found" with high confidence about name spelling — only claim confidence about formatting/role-expansion issues that don't require outside verification.

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
