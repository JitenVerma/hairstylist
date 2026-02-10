import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL_NAME = "gemini-2.5-flash-image";
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = Math.floor(4.2 * 1024 * 1024);
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function isImageFile(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.arrayBuffer === "function" &&
    typeof value.type === "string" &&
    typeof value.size === "number"
  );
}

function validateFile(file, label) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`${label} must be PNG, JPEG, or WEBP.`);
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`${label} must be 10MB or smaller.`);
  }
}

async function fileToInlinePart(file) {
  const bytes = await file.arrayBuffer();
  const base64Data = Buffer.from(bytes).toString("base64");
  return {
    inlineData: {
      mimeType: file.type,
      data: base64Data
    }
  };
}

function buildPrompt({ selectedHair, selectedBeard, customStyle }) {
  const hairstyle = selectedHair?.trim() || "no specific hairstyle selected";
  const beard = selectedBeard?.trim() || "no specific beard style selected";
  const custom = customStyle?.trim() || "no additional custom style notes";

  return [
    "You are editing the same person from three reference photos: front, side, and rear.",
    "Generate one realistic portrait image that keeps identity, skin tone, and facial structure consistent.",
    "Only change styling attributes requested below.",
    `Requested hairstyle: ${hairstyle}.`,
    `Requested beard style: ${beard}.`,
    `Custom request: ${custom}.`,
    "Avoid changing age, expression, camera angle drastically, and avoid adding unrelated accessories.",
    "Output a photorealistic result."
  ].join(" ");
}

export async function POST(request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GOOGLE_API_KEY on the server." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const front = formData.get("front");
    const side = formData.get("side");
    const rear = formData.get("rear");
    const selectedHair = String(formData.get("selectedHair") || "");
    const selectedBeard = String(formData.get("selectedBeard") || "");
    const customStyle = String(formData.get("customStyle") || "");

    if (!isImageFile(front) || !isImageFile(side) || !isImageFile(rear)) {
      return NextResponse.json(
        { error: "Front, side, and rear profile images are required." },
        { status: 400 }
      );
    }

    validateFile(front, "Front image");
    validateFile(side, "Side image");
    validateFile(rear, "Rear image");

    const totalSizeBytes = front.size + side.size + rear.size;
    if (totalSizeBytes > MAX_TOTAL_IMAGE_BYTES) {
      return NextResponse.json(
        {
          error: "Total image payload is too large. Please keep all 3 images under 4.2 MB combined."
        },
        { status: 400 }
      );
    }

    const [frontPart, sidePart, rearPart] = await Promise.all([
      fileToInlinePart(front),
      fileToInlinePart(side),
      fileToInlinePart(rear)
    ]);

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        { text: buildPrompt({ selectedHair, selectedBeard, customStyle }) },
        frontPart,
        sidePart,
        rearPart
      ]
    });

    const parts = response?.candidates?.[0]?.content?.parts || [];
    const textParts = parts.filter((part) => part.text).map((part) => part.text);
    const imagePart = parts.find((part) => part.inlineData);

    if (!imagePart?.inlineData?.data) {
      return NextResponse.json(
        {
          error: "Model did not return an image.",
          details: textParts.join(" ").slice(0, 500)
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      imageData: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || "image/png",
      text: textParts.join("\n").trim()
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to generate image preview." },
      { status: 500 }
    );
  }
}
