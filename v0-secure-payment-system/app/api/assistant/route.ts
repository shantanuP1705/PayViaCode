import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const runtime = "nodejs"

type RequestBody = {
  text: string
  invoiceCode?: string
  page?: string
}

const SYSTEM_PROMPT = `You are a helpful customer support assistant for a secure payment system.
- Answer clearly and concisely.
- If the user mentions problems (failed payment, refund, chargeback), provide next steps and recommend contacting support with a reference.
- If an invoice code is provided, reference it in your answer.
- Do not reveal internal keys or sensitive backend details.
- Keep responses under 120 words.

Return ONLY JSON using this TypeScript shape:
{
  "title"?: string,
  "summary"?: string,
  "steps"?: string[],
  "actions"?: string[],
  "links"?: { label: string, url: string }[],
  "note"?: string
}
No prose outside JSON.`

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GOOGLE_API_KEY. Set it in .env.local." },
        { status: 500 },
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" })

    const context = [`Page: ${body.page ?? "unknown"}`]
    if (body.invoiceCode) context.push(`Invoice Code: ${body.invoiceCode}`)

    const prompt = [SYSTEM_PROMPT, `Context: ${context.join(" | ")}`, `User: ${body.text}`].join("\n\n")

    const result = await model.generateContent(prompt)
    const out = result.response.text()

    let structured: any | null = null
    try {
      // Attempt to parse raw JSON; if the model added prose, extract the JSON substring
      const start = out.indexOf('{')
      const end = out.lastIndexOf('}')
      const jsonText = start !== -1 && end !== -1 ? out.slice(start, end + 1) : out
      structured = JSON.parse(jsonText)
    } catch {
      structured = null
    }

    // Also return the original text for fallback rendering
    return NextResponse.json({ message: out, structured })
  } catch (err: any) {
    const msg = typeof err?.message === "string" ? err.message : "Failed to contact assistant"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
