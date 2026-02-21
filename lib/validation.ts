import { z } from "zod";
import { NextResponse } from "next/server";

// POST /api/email/send
export const emailSendSchema = z.object({
  messageId: z.string().min(1, "messageId is required"),
  subject: z.string().optional(),
  body_text: z.string().optional(),
});

// POST /api/ai/generate
export const aiGenerateSchema = z.object({
  leadId: z.string().min(1, "leadId is required"),
  campaignId: z.string().optional(),
  step: z.coerce.number().int().positive().optional(),
});

// POST /api/leads/search
export const leadsSearchSchema = z.object({
  query: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, "query is required"),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type EmailSendBody = z.infer<typeof emailSendSchema>;
export type AiGenerateBody = z.infer<typeof aiGenerateSchema>;
export type LeadsSearchBody = z.infer<typeof leadsSearchSchema>;

/**
 * Parse and validate request body against a Zod schema.
 * Returns { data, error }. If error, return NextResponse.json with 400.
 */
export async function parseBody<T>(
  schema: z.ZodSchema<T>,
  request: Request
): Promise<
  | { data: T; error: null }
  | { data: null; error: NextResponse }
> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        {
          error: "Validation failed",
          details: { formErrors: ["Invalid JSON body"], fieldErrors: {} },
        },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(json);
  if (result.success) {
    return { data: result.data, error: null };
  }

  return {
    data: null,
    error: NextResponse.json(
      {
        error: "Validation failed",
        details: result.error.flatten(),
      },
      { status: 400 }
    ),
  };
}
