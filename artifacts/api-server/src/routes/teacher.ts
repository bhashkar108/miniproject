import { Router, type IRouter } from "express";
import { db, progressTable, studyMaterialsTable } from "@workspace/db";
import {
  ExplainStudyMaterialBody,
  ExplainStudyMaterialResponse,
  UploadStudyMaterialBody,
  UploadStudyMaterialResponse,
} from "@workspace/api-zod";
import { requireVisitor, type VisitorRequest } from "../lib/auth";
import { generateJson } from "../lib/gemini";
import { HttpError } from "../lib/httpErrors";
import {
  extractDocumentText,
  readUploadedDocument,
  receiveSingleUpload,
  toValidationBlob,
} from "../lib/uploads";

const router: IRouter = Router();

router.post(
  "/teacher/uploads",
  requireVisitor,
  receiveSingleUpload,
  async (req, res): Promise<void> => {
    const file = readUploadedDocument(req.file);
    const uploadBody = UploadStudyMaterialBody.safeParse({
      file: toValidationBlob(file.buffer, file.mimeType),
    });
    if (!uploadBody.success) {
      res.status(400).json({ error: uploadBody.error.message });
      return;
    }

    const extractedText = await extractDocumentText(file);
    const userId = (req as VisitorRequest).userId;
    if (userId) {
      try {
        await db.insert(studyMaterialsTable).values({
          userId,
          fileName: file.fileName,
          mimeType: file.mimeType,
          extractedText,
        });
      } catch {}
    }

    res.json(
      UploadStudyMaterialResponse.parse({
        fileName: file.fileName,
        mimeType: file.mimeType,
        extractedText,
      }),
    );
  },
);

router.post("/teacher/explain", requireVisitor, async (req, res): Promise<void> => {
  const parsed = ExplainStudyMaterialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { content, question, language } = parsed.data;
  const rawResult = await generateJson<unknown>(
    `You are a friendly, encouraging, and natural human teacher. 
Explain in a warm, conversational, human tone — exactly like an expert teacher talking naturally with a student face-to-face. 
Do NOT talk like a robotic textbook or repeat words unnaturally. 
Speak in complete, fluent, natural sentences. Keep the language simple, engaging, and clear.
Use ${language} throughout.
If the student asked a specific question (${question?.trim() || "Explain this topic clearly"}), answer it directly first with an intuitive real-world analogy.

Return valid JSON with this exact shape:
{
  "title": "short, engaging lesson title",
  "explanation": "warm, conversational explanation structured in natural paragraphs with intuitive examples",
  "keyPoints": ["concise practical takeaway"],
  "followUpQuestions": ["thought-provoking question the student can explore next"]
}

Base your explanation strictly on this study material:
${content}`,
  );
  const result = ExplainStudyMaterialResponse.safeParse(rawResult);
  if (!result.success) {
    throw new HttpError(502, "The lesson response could not be read. Please try again.");
  }

  const userId = (req as VisitorRequest).userId;
  if (userId) {
    try {
      await db.insert(progressTable).values({
        userId,
        kind: "lesson",
        title: result.data.title.slice(0, 255),
        details: `AI Teacher session · ${result.data.keyPoints.slice(0, 4).join(" · ")}`.slice(0, 2000),
        minutes: 0,
      });
    } catch {}
  }
  res.json(result.data);
});

export default router;
