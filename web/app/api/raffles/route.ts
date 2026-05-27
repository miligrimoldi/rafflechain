import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizer = searchParams.get("organizer");

  try {
    const raffles = await prisma.raffleMetadata.findMany({
      where: organizer
        ? { organizerAddress: organizer.toLowerCase() }
        : undefined,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(raffles);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { raffleIdOnChain, title, description, organizerName, organizerAddress, imageUrl, conditions, deliveryInfo } = body;

  if (raffleIdOnChain === undefined || raffleIdOnChain === null) {
    return NextResponse.json({ error: "raffleIdOnChain is required" }, { status: 400 });
  }
  if (typeof raffleIdOnChain !== "number" || !Number.isInteger(raffleIdOnChain)) {
    return NextResponse.json({ error: "raffleIdOnChain must be an integer" }, { status: 400 });
  }
  if (!title || typeof title !== "string" || title.trim() === "") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!description || typeof description !== "string" || description.trim() === "") {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  if (!organizerName || typeof organizerName !== "string" || organizerName.trim() === "") {
    return NextResponse.json({ error: "organizerName is required" }, { status: 400 });
  }

  try {
    const existing = await prisma.raffleMetadata.findUnique({
      where: { raffleIdOnChain },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Metadata for raffleIdOnChain ${raffleIdOnChain} already exists` },
        { status: 409 }
      );
    }

    const raffle = await prisma.raffleMetadata.create({
      data: {
        raffleIdOnChain,
        title: title.trim(),
        description: description.trim(),
        organizerName: organizerName.trim(),
        organizerAddress: typeof organizerAddress === "string" ? organizerAddress.toLowerCase() : null,
        imageUrl: typeof imageUrl === "string" ? imageUrl : null,
        conditions: typeof conditions === "string" ? conditions : null,
        deliveryInfo: typeof deliveryInfo === "string" ? deliveryInfo : null,
      },
    });

    return NextResponse.json(raffle, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
