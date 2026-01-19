
import { GoogleGenAI, Type } from "@google/genai";
import { MathSolution, AppError } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

const MATH_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    problem: { type: Type.STRING },
    steps: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    finalAnswer: { type: Type.STRING },
    category: { type: Type.STRING }
  },
  required: ["problem", "steps", "finalAnswer", "category"]
};

const handleError = (error: any): never => {
  console.error("Gemini API Error:", error);
  const msg = error?.message?.toLowerCase() || "";
  
  if (msg.includes("fetch") || msg.includes("network")) {
    throw { type: 'NETWORK', message: "Connection lost. Please check your internet." } as AppError;
  }
  if (msg.includes("429") || msg.includes("quota") || msg.includes("limit")) {
    throw { type: 'API_LIMIT', message: "Daily limit reached. Please try again later." } as AppError;
  }
  if (msg.includes("safety") || msg.includes("blocked")) {
    throw { type: 'INVALID_INPUT', message: "This content was blocked by safety filters." } as AppError;
  }
  if (msg.includes("parse") || msg.includes("json")) {
    throw { type: 'OCR_FAILED', message: "Could not read the math problem. Try a clearer photo." } as AppError;
  }
  
  throw { type: 'UNKNOWN', message: "Something went wrong. Please try again." } as AppError;
};

export const solveMathProblem = async (problem: string, language: string = 'English'): Promise<MathSolution> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Solve this math problem step-by-step in ${language}: "${problem}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: MATH_SCHEMA,
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });

    if (!response.text) throw new Error("Empty response");
    return JSON.parse(response.text);
  } catch (err) {
    return handleError(err);
  }
};

export const analyzeImage = async (base64Image: string, language: string = 'English'): Promise<MathSolution> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
          { text: `Extract and solve the math problem in this image. Provide a step-by-step solution in ${language}.` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: MATH_SCHEMA
      }
    });

    if (!response.text) throw new Error("OCR failed");
    return JSON.parse(response.text);
  } catch (err) {
    return handleError(err);
  }
};
