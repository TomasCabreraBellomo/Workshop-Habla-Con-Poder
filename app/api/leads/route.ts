import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type LeadPayload = {
  firstName?: unknown;
  lastName?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  company?: unknown;
  role?: unknown;
  sector?: unknown;
  paymentMethod?: unknown;
  serviceInterest?: unknown;
  source?: unknown;
  message?: unknown;
  acceptedTerms?: unknown;
};

const MAX_LENGTH = 500;

function clean(value: unknown, maxLength = MAX_LENGTH) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function normalizeEmail(value: unknown) {
  return clean(value, 254)?.toLowerCase();
}

function normalizePhone(value: unknown) {
  return clean(value, 40)?.replace(/[^\d+()\-\s.]/g, "");
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LeadPayload;

    const firstName = clean(payload.firstName, 120);
    const lastName = clean(payload.lastName, 120);
    const providedName = clean(payload.name, 240);
    const name = providedName ?? [firstName, lastName].filter(Boolean).join(" ").trim();
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);

    if (!name || (!email && !phone)) {
      return NextResponse.json(
        { ok: false, message: "Completá el nombre y al menos un e-mail o teléfono." },
        { status: 400 },
      );
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone,
        lastName,
        company: clean(payload.company, 160),
        role: clean(payload.role, 160),
        sector: clean(payload.sector, 160),
        paymentMethod: clean(payload.paymentMethod, 220),
        serviceInterest: clean(payload.serviceInterest, 180) ?? "Workshop Habla con Poder",
        source: clean(payload.source, 120) ?? "workshop_habla_con_poder",
        message: clean(payload.message, 1000),
        acceptedTerms: payload.acceptedTerms === true,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { ok: true, message: "Inscripción recibida correctamente.", lead },
      { status: 201 },
    );
  } catch (error) {
    console.error("Lead creation failed", error);

    return NextResponse.json(
      { ok: false, message: "No pudimos guardar la inscripción. Intentá nuevamente." },
      { status: 500 },
    );
  }
}
