import { GoogleGenAI, Type } from "@google/genai";
import { ParsedFile, JoinCandidate, AIContext } from '../types';

// Helper to sanitize data for the prompt to avoid token limits with massive files
const prepareFileSummary = (file: ParsedFile) => {
  return {
    fileName: file.name,
    headers: file.headers,
    // Take a small sample of unique values for each header to help with type/content inference
    sampleData: file.previewData.slice(0, 3).map(row => {
      // Create a simplified row object matching headers to values
      const simplifiedRow: Record<string, any> = {};
      file.headers.forEach(header => {
        simplifiedRow[header] = row[header];
      });
      return simplifiedRow;
    })
  };
};

export const analyzeFilesForJoin = async (files: ParsedFile[]): Promise<JoinCandidate[]> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key not found in environment variables");
    }

    const ai = new GoogleGenAI({ apiKey });
    const fileSummaries = files.map(prepareFileSummary);

    const prompt = `
      You are a data integration expert. Analyze the following ${files.length} dataset summaries.
      Your task is to identify potential common columns (keys) that could be used to JOIN these files together.
      
      Consider:
      1. Column names (fuzzy matching, synonyms like 'id', 'user_id', 'userId').
      2. Data content samples (do they look like keys? e.g., emails, UUIDs, integer IDs).
      3. Uniqueness and potential nulls.
      
      Return a JSON object containing a list of 'candidates'. 
      Each candidate represents a potential join key strategy.
      Order candidates by confidence score (highest first).
      
      Datasets:
      ${JSON.stringify(fileSummaries, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            candidates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  keyName: {
                    type: Type.STRING,
                    description: "A generic, descriptive name for the common key (e.g., 'User Email' or 'Product ID').",
                  },
                  confidenceScore: {
                    type: Type.NUMBER,
                    description: "Confidence level from 0 to 100.",
                  },
                  reasoning: {
                    type: Type.STRING,
                    description: "Explanation of why this key was chosen and how the columns match.",
                  },
                  columnMappings: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        fileName: { type: Type.STRING },
                        columnName: { type: Type.STRING }
                      }
                    }
                  },
                  potentialIssues: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "List of potential problems (e.g., 'Data types might mismatch', 'Possible duplicates')."
                  }
                },
                required: ["keyName", "confidenceScore", "reasoning", "columnMappings"]
              }
            }
          }
        }
      }
    });

    if (!response.text) {
      throw new Error("No response from Gemini");
    }

    const result = JSON.parse(response.text);
    return result.candidates as JoinCandidate[];

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const generateMergePlan = async (files: ParsedFile[], candidate: JoinCandidate): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not found");
    const ai = new GoogleGenAI({ apiKey });
    const summaries = files.map(prepareFileSummary);

    const prompt = `
      You are an expert Data Engineer planning a semantic merge of ${files.length} datasets.
      Primary Join Key: ${candidate.keyName}
      
      Datasets:
      ${JSON.stringify(summaries, null, 2)}
      
      Task:
      Draft a concise "Merge Execution Plan" for the user to review.
      
      Include:
      1. How you will match entities (fuzzy matching, strict matching, etc).
      2. Which columns from different files are synonyms and will be merged into one (e.g. 'Cell' and 'Phone').
      3. How you will handle conflicts (e.g. if File A says $50 and File B says $60).
      4. How 1:N relationships (e.g. Customers -> Orders) will be structured (Denormalized/Repeated rows).

      Keep it simple, clear, and editable. The user will read this and might change it to give you instructions.
      Do not output JSON. Output plain text.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Could not generate plan.";

  } catch (error) {
    console.error("Plan Generation Error:", error);
    return "Error generating plan. Please write your instructions manually.";
  }
};

export const generateSemanticMerge = async (files: ParsedFile[], candidate: JoinCandidate, userInstructions?: string): Promise<any[]> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not found");
    const ai = new GoogleGenAI({ apiKey });

    // We take a larger sample for the actual semantic merge to provide meaningful results
    // Capping at ~50 rows per file to stay within reasonable output token limits for the merged result
    const samples = files.map(f => ({
      fileName: f.name,
      // We assume f.data is the full dataset. We slice top 50.
      data: f.data.slice(0, 50)
    }));

    const prompt = `
      You are an expert Data Engineer performing a 'Semantic Merge' on ${files.length} datasets.
      
      Goal: Create a single, unified, FLAT dataset (array of objects).
      
      User Plan / Instructions:
      ${userInstructions || `
        1. Identify rows that refer to the SAME real-world entity using '${candidate.keyName}' as a guide.
        2. Consolidate synonymous columns.
        3. Resolve conflicts intelligently.
        4. If a 1:N relationship exists, generate separate rows (denormalized).
      `}
      
      CRITICAL OUTPUT RULES:
      1. Return ONLY a JSON Array of objects. No markdown formatting.
      2. EACH OBJECT must be FLAT. 
         - CORRECT: { "ID": 1, "Name": "Alice", "Order_Item": "Apple" }
         - INCORRECT: { "ID": 1, "Name": "Alice", "Orders": ["Apple", "Banana"] }
         - INCORRECT: { "ID": 1, "Details": { "Age": 30 } }
      3. All values MUST be primitives (string, number, boolean, or null). Do NOT use arrays or objects as values.
      4. Do NOT output "orphan" text or error messages as rows. If a row cannot be merged, include it with nulls for missing columns.
      5. Use a column named '_AI_Notes' for any comments, errors, or fuzzy match explanations.
      
      Input Data:
      ${JSON.stringify(samples, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    if (!response.text) return [];
    
    let rawResult;
    try {
      rawResult = JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse JSON", response.text);
      return [];
    }

    // Sanitize: Ensure flat structure (no nested objects/arrays)
    if (Array.isArray(rawResult)) {
      return rawResult.map((row: any) => {
        // Filter out if the row itself is just a string (common error)
        if (typeof row !== 'object' || row === null) return {};

        const cleanRow: any = {};
        Object.keys(row).forEach(key => {
          const val = row[key];
          
          if (val === null || val === undefined) {
             cleanRow[key] = null;
          } else if (Array.isArray(val)) {
             // Force flatten arrays to string
             cleanRow[key] = val.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(' | ');
          } else if (typeof val === 'object') {
             // Force flatten objects to string
             cleanRow[key] = JSON.stringify(val);
          } else {
             cleanRow[key] = val;
          }
        });
        return cleanRow;
      });
    }

    return [];

  } catch (error) {
    console.error("Semantic Merge Error:", error);
    throw new Error("Failed to perform AI Semantic Merge.");
  }
};

export const chatWithDataset = async (
  file: ParsedFile, 
  userMessage: string
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not found");
    const ai = new GoogleGenAI({ apiKey });

    const summary = prepareFileSummary(file);
    const context = file.aiContext || { chatHistory: [] };

    const systemInstruction = `
      You are an expert Data Analyst AI. You are helping a user understand a specific dataset.
      
      Dataset Metadata:
      - Name: ${file.name}
      - Columns: ${file.headers.join(', ')}
      - Row Count: ${file.rowCount}
      - Sample Data: ${JSON.stringify(summary.sampleData)}

      User Provided Context (The user has told you this):
      - Description: ${context.userDescription || 'None provided'}
      - Column Meanings: ${JSON.stringify(context.columnMeanings || {})}

      Your goal is to provide insights, answer questions, and identify trends.
      If you are unsure about what a column means, ASK the user for clarification.
      If the user provides a clarification (e.g., "Column X is the revenue"), acknowledge it and use it in future answers.
      
      Be concise, professional, and helpful. Format your response in Markdown.
    `;

    // Construct history for the model
    // We only send the last 10 messages to keep context window manageable
    const recentHistory = context.chatHistory.slice(-10).map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    // Perform the generation using a clean 'generateContent' approach 
    // effectively manually managing the chat state for full control over the system prompt injection
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...recentHistory,
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "I couldn't generate a response.";

  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Sorry, I encountered an error while analyzing the data.";
  }
};