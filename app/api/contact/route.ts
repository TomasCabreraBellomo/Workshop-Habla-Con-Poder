import { NextResponse } from "next/server";

type ContactPayload = {
  firstName?: unknown;
  lastName?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  company?: unknown;
  role?: unknown;
  sector?: unknown;
  paymentMethod?: unknown;
  message?: unknown;
  source?: unknown;
  acceptedTerms?: unknown;
};

type NormalizedContactPayload = {
  name: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  sector?: string;
  paymentMethod?: string;
  message?: string;
  source: string;
  acceptedTerms: boolean;
};

type AppsScriptResponse = {
  success?: boolean;
  error?: string;
};

function normalizeString(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function normalizeEmail(value: unknown) {
  return normalizeString(value, 254)?.toLowerCase();
}

function normalizePhone(value: unknown) {
  return normalizeString(value, 40)?.replace(/[^\d+()\-\s.]/g, "");
}

function parseAppsScriptResponse(responseText: string) {
  try {
    return JSON.parse(responseText) as AppsScriptResponse;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("Contact submission failed: GOOGLE_SHEETS_WEBHOOK_URL is missing");

      return NextResponse.json(
        { success: false, error: "GOOGLE_SHEETS_WEBHOOK_URL no está configurada" },
        { status: 500 },
      );
    }

    const payload = (await request.json()) as ContactPayload;

    const firstName = normalizeString(payload.firstName, 120);
    const lastName = normalizeString(payload.lastName, 120);
    const providedName = normalizeString(payload.name, 240);
    const name = providedName ?? [firstName, lastName].filter(Boolean).join(" ").trim();
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);

    if (!name || (!email && !phone)) {
      return NextResponse.json(
        { success: false, error: "Completa el nombre y al menos un e-mail o telefono." },
        { status: 400 },
      );
    }

    const contact: NormalizedContactPayload = {
      name,
      lastName,
      email,
      phone,
      company: normalizeString(payload.company, 160),
      role: normalizeString(payload.role, 160),
      sector: normalizeString(payload.sector, 160),
      paymentMethod: normalizeString(payload.paymentMethod, 220),
      message: normalizeString(payload.message, 1000),
      source: normalizeString(payload.source, 120) ?? "website",
      acceptedTerms: payload.acceptedTerms === true,
    };

    const sheetsResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact),
      cache: "no-store",
    });

    const sheetsResponseText = await sheetsResponse.text();
    const sheetsResult = parseAppsScriptResponse(sheetsResponseText);

    if (!sheetsResponse.ok) {
      console.error("Google Apps Script responded with non-OK status", {
        status: sheetsResponse.status,
        statusText: sheetsResponse.statusText,
        responseText: sheetsResponseText,
      });

      return NextResponse.json(
        {
          success: false,
          error: sheetsResponseText || "Google Apps Script no respondio correctamente.",
        },
        { status: 502 },
      );
    }

    if (sheetsResult?.success === false) {
      console.error("Google Apps Script returned success false", {
        error: sheetsResult.error,
        responseText: sheetsResponseText,
      });

      return NextResponse.json(
        {
          success: false,
          error: sheetsResult.error || "Google Apps Script rechazo el envio.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Google Sheets contact submission failed", error);

    return NextResponse.json(
      { success: false, error: "No pudimos enviar el formulario. Intenta nuevamente." },
      { status: 500 },
    );
  }
}
