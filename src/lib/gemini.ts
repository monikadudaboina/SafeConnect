import { GoogleGenAI, Type } from "@google/genai";
import { TriageResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const triageEmergency = async (input: string): Promise<TriageResult> => {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are the AI Brain of SafeConnect, a Unified Crisis Management Ecosystem (UCME).
    Your goal is to triage panicked emergency reports into structured JSON packets.
    Extract the severity (1-10), type of emergency, probable location, and a concise summary.
    Also generate 2-3 immediate "Action Cards" for staff.
    
    If location is missing, set it to "Unknown/GPS Pending".
    Translate any non-English message into English for the description.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: `PANIC MESSAGE: "${input}"`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "Emergency category (Fire, Medical, Security, etc.)" },
          severity: { type: Type.NUMBER, description: "Intensity from 1 to 10" },
          location: { type: Type.STRING },
          description: { type: Type.STRING, description: "Clear summary in English" },
          actions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Task assignments for staff"
          }
        },
        required: ["type", "severity", "location", "description", "actions"]
      }
    }
  });

  return JSON.parse(response.text || "{}") as TriageResult;
};

export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
  const model = "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        inlineData: {
          mimeType,
          data: audioBase64
        }
      },
      {
        text: "Transcribe the following emergency audio message. Only provide the transcribed text."
      }
    ],
  });

  return response.text || "";
};

export const translateMessage = async (text: string, targetLang: string = "English"): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Translate the following text to ${targetLang}: "${text}"`,
  });
  return response.text || text;
};

export const generateQuickReplies = async (context: string, senderType: string): Promise<string[]> => {
  const systemInstruction = `
    You are an AI Incident Manager in a crisis command center. 
    Current context of the conversation: "${context}".
    The user who will see these buttons is a "${senderType}".
    Generate 3-4 short, professional, tactical quick replies.
    If the user is a guest, make them reassuring but authoritative (e.g., "I am safe", "I need water", "Send help now").
    If the user is staff, make them technical and action-oriented (e.g., "Acknowledged", "Grid clear", "Escalating").
    Return ONLY JSON with a 'suggestions' field as an array of strings.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            minItems: 3,
            maxItems: 4
          }
        },
        required: ["suggestions"]
      }
    },
    contents: "GENERATE_SUGGESTIONS"
  });

  try {
    const parsed = JSON.parse(response.text || "{}");
    return parsed.suggestions || [];
  } catch (e) {
    return [];
  }
};
