export default async function handler(req: any, res: any) {
  try {
    const envKey = process.env.GEMINI_API_KEY;
    const nodeVersion = process.version;
    const now = new Date().toISOString();
    const vercelRegion = process.env.VERCEL_REGION || process.env.REGION || "local";

    res.status(200).json({
      status: "ok",
      time: now,
      nodeVersion,
      vercelRegion,
      geminiKeySet: Boolean(envKey && envKey !== "PLACEHOLDER_API_KEY"),
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err?.message || "Erro desconhecido" });
  }
}
