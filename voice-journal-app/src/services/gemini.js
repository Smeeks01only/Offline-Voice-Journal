import * as FileSystem from 'expo-file-system/legacy';
import { FileSystemUploadType } from 'expo-file-system/legacy';

const getApiKey = () => {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!key || key === 'YOUR_API_KEY_HERE') {
    throw new Error('InvalidKeyError: Gemini API key is missing or invalid.');
  }
  return key;
};

// Map file extensions to mime types (Expo AV defaults to m4a/mp4 on most presets)
const getMimeType = (uri) => {
  const extension = uri.split('.').pop().toLowerCase();
  switch (extension) {
    case 'm4a':
    case 'mp4':
      return 'audio/m4a';
    case 'aac':
      return 'audio/aac';
    case 'wav':
      return 'audio/wav';
    case 'mp3':
      return 'audio/mp3';
    case 'webm':
      return 'audio/webm'; // Webm might not be supported but keep as is for now
    case 'ogg':
      return 'audio/ogg';
    default:
      return 'audio/m4a'; // fallback
  }
};

const uploadAudioFile = async (audioUri) => {
  const apiKey = getApiKey();
  const mimeType = getMimeType(audioUri);
  // Using the old files endpoint for upload since it yields a file.uri which works with Interactions API
  const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=media`;

  try {
    const uploadResult = await FileSystem.uploadAsync(uploadUrl, audioUri, {
      httpMethod: 'POST',
      uploadType: FileSystemUploadType?.BINARY_CONTENT ?? 0,
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': mimeType,
      },
    });

    if (uploadResult.status !== 200) {
      if (uploadResult.status === 429) throw new Error('RateLimitError: Too many requests to Gemini API.');
      if (uploadResult.status === 400 || uploadResult.status === 401 || uploadResult.status === 403) {
        throw new Error(`InvalidKeyError: Unauthorized (${uploadResult.status})`);
      }
      throw new Error(`GeminiAPIError: File upload failed with status ${uploadResult.status}`);
    }

    const responseData = JSON.parse(uploadResult.body);
    return {
      fileUri: responseData.file.uri,
      mimeType: mimeType
    };
  } catch (error) {
    if (error.message.includes('Error')) throw error;
    throw new Error(`NetworkError: Failed to upload file - ${error.message}`);
  }
};

const callGenerateContent = async (fileUri, mimeType, isRetry = false) => {
  const apiKey = getApiKey();
  const model = 'gemini-3.6-flash'; 
  
  let promptText = `
    Listen to the provided audio journal entry.
    Extract and return ONLY a JSON object containing the reflection details.
    Do not include any markdown formatting (like \`\`\`json), no preamble, no code fences. Just output the raw JSON.
  `;

  if (isRetry) {
    promptText += `\nCRITICAL: Your previous response was invalid. You MUST return ONLY valid, parseable JSON with NO surrounding text, NO markdown code fences, and NO extra characters.`;
  }

  const payload = {
    model: model,
    input: [
      {
        type: "text",
        text: promptText
      },
      {
        type: "audio",
        uri: fileUri,
        mime_type: mimeType
      }
    ],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: {
        type: "object",
        properties: {
          transcript: { type: "string", description: "The full transcription of what was said." },
          mood: { type: "string", description: "A 1-2 word description of the emotional tone." },
          themes: { type: "array", items: { type: "string" }, description: "2-4 primary topics discussed." },
          summary: { type: "string", description: "A 1-2 sentence summary of the entry." },
          follow_up_question: { type: "string", description: "A thoughtful question for the user to reflect on." }
        },
        required: ["transcript", "mood", "themes", "summary", "follow_up_question"]
      }
    }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/interactions`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) throw new Error('RateLimitError: Too many requests to Gemini API.');
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new Error(`InvalidKeyError: Unauthorized generating content (${response.status}): ${errorText}`);
      }
      throw new Error(`GeminiAPIError: Generation failed with status ${response.status}. Details: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error.message.includes('Error')) throw error;
    throw new Error(`NetworkError: Failed to fetch generation - ${error.message}`);
  }
};

export const processEntry = async (audioUri) => {
  // Step 1: Upload the file
  const { fileUri, mimeType } = await uploadAudioFile(audioUri);
  
  // Step 2 & 3: Generate content and parse JSON
  let rawText = '';
  try {
    const genData = await callGenerateContent(fileUri, mimeType, false);
    const outputStep = genData.steps?.find(step => step.type === 'model_output');
    rawText = outputStep?.content?.[0]?.text || '';
    
    // Clean up potential markdown if the model hallucinates it despite instructions and responseMimeType
    const cleanedText = rawText.replace(/```json\n/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);

  } catch (error) {
    if (error instanceof SyntaxError) {
      // Step 4: Retry once on parse failure
      try {
        const retryGenData = await callGenerateContent(fileUri, mimeType, true);
        const retryOutputStep = retryGenData.steps?.find(step => step.type === 'model_output');
        rawText = retryOutputStep?.content?.[0]?.text || '';
        
        const cleanedText = rawText.replace(/```json\n/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
      } catch (retryError) {
        throw new Error(`ParseError: Failed to parse Gemini response into JSON even after retry.`);
      }
    } else {
      // It was an API or Network error, bubble it up natively
      throw error;
    }
  }
};

export const processTextEntry = async (transcript) => {
  const apiKey = getApiKey();
  const model = 'gemini-3.6-flash';
  
  const promptText = `
    Analyze the following journal entry transcript.
    Extract and return ONLY a JSON object containing the reflection details.
    Do not include any markdown formatting (like \`\`\`json), no preamble, no code fences. Just output the raw JSON.
    
    Transcript:
    "${transcript}"
  `;

  const payload = {
    model: model,
    input: [
      {
        type: "text",
        text: promptText
      }
    ],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: {
        type: "object",
        properties: {
          transcript: { type: "string", description: "The full transcription of what was said." },
          mood: { type: "string", description: "A 1-2 word description of the emotional tone." },
          themes: { type: "array", items: { type: "string" }, description: "2-4 primary topics discussed." },
          summary: { type: "string", description: "A 1-2 sentence summary of the entry." },
          follow_up_question: { type: "string", description: "A thoughtful question for the user to reflect on." }
        },
        required: ["transcript", "mood", "themes", "summary", "follow_up_question"]
      }
    }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/interactions`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) throw new Error('RateLimitError: Too many requests to Gemini API.');
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new Error(`InvalidKeyError: Unauthorized generating content (${response.status}): ${errorText}`);
      }
      throw new Error(`GeminiAPIError: Generation failed with status ${response.status}. Details: ${errorText}`);
    }

    const data = await response.json();
    const outputStep = data.steps?.find(step => step.type === 'model_output');
    const rawText = outputStep?.content?.[0]?.text || '';
    
    const cleanedText = rawText.replace(/```json\n/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`ParseError: Failed to parse Gemini response into JSON.`);
    } else if (error.message.includes('Error')) {
      throw error;
    }
    throw new Error(`NetworkError: Failed to fetch generation - ${error.message}`);
  }
};
