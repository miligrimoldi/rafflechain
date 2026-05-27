import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { prisma } from "@/lib/prisma";
import { getReadContract } from "@/lib/contract";

type Params = { params: Promise<{ raffleIdOnChain: string }> };

const REQUIRED_FIELDS = ["title", "description", "organizerName"] as const;
const OPTIONAL_FIELDS = ["imageUrl", "conditions", "deliveryInfo"] as const;

type UpdateData = {
  title?: string;
  description?: string;
  organizerName?: string;
  imageUrl?: string | null;
  conditions?: string | null;
  deliveryInfo?: string | null;
};

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

export async function GET(_request: Request, { params }: Params) {
  const { raffleIdOnChain: rawId } = await params;
  const id = parseId(rawId);

  if (id === null) {
    return NextResponse.json({ error: "raffleIdOnChain must be an integer" }, { status: 400 });
  }

  try {
    const raffle = await prisma.raffleMetadata.findUnique({
      where: { raffleIdOnChain: id },
    });
    if (!raffle) {
      return NextResponse.json({ error: "Raffle metadata not found" }, { status: 404 });
    }
    return NextResponse.json(raffle);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { raffleIdOnChain: rawId } = await params;
  const id = parseId(rawId);

  if (id === null) {
    return NextResponse.json({ error: "raffleIdOnChain must be an integer" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify signature
  const { signature, timestamp } = body;

  if (typeof signature !== "string" || typeof timestamp !== "number") {
    return NextResponse.json({ error: "Firma requerida para editar" }, { status: 401 });
  }

  // Reject signatures older than 10 minutes
  if (Math.abs(Date.now() - timestamp) > 600_000) {
    return NextResponse.json({ error: "Firma expirada. Intentá de nuevo." }, { status: 401 });
  }

  try {
    const message = `Edit RaffleChain metadata #${id}\nTimestamp: ${timestamp}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    const contract = getReadContract();
    const onChainRaffle = await contract.getRaffle(id);
    const organizer: string = onChainRaffle.organizer;

    if (recoveredAddress.toLowerCase() !== organizer.toLowerCase()) {
      return NextResponse.json(
        { error: "No autorizado: solo el organizador puede editar la metadata" },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Error al verificar la firma" }, { status: 401 });
  }

  // Build update payload
  const data: UpdateData = {};

  for (const field of REQUIRED_FIELDS) {
    if (!(field in body)) continue;
    const val = body[field];
    if (typeof val !== "string" || val.trim() === "") {
      return NextResponse.json({ error: `${field} must be a non-empty string` }, { status: 400 });
    }
    data[field] = val.trim();
  }

  for (const field of OPTIONAL_FIELDS) {
    if (!(field in body)) continue;
    const val = body[field];
    if (val !== null && typeof val !== "string") {
      return NextResponse.json({ error: `${field} must be a string or null` }, { status: 400 });
    }
    data[field] = val as string | null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  try {
    const existing = await prisma.raffleMetadata.findUnique({
      where: { raffleIdOnChain: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Raffle metadata not found" }, { status: 404 });
    }

    const updated = await prisma.raffleMetadata.update({
      where: { raffleIdOnChain: id },
      data,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
