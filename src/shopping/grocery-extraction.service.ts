import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';

export type ExtractedItem = {
  name: string;
  quantity?: number | null;
  price?: number | null;
  confidence: number;
};

@Injectable()
export class GroceryExtractionService {
  private client?: OpenAI;

  constructor(private readonly config: ConfigService) {}

  // Created on first use so the API still boots when OPENAI_API_KEY is unset; only capture fails.
  private get openai(): OpenAI {
    if (!this.client) {
      const apiKey = this.config.get<string>('OPENAI_API_KEY');
      if (!apiKey) throw new ServiceUnavailableException('AI capture is not configured: OPENAI_API_KEY is missing');
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  async extractFromAudio(file: Express.Multer.File): Promise<ExtractedItem[]> {
    const transcription = await this.openai.audio.transcriptions.create({
      file: await toFile(file.buffer, file.originalname || 'shopping-audio.webm', { type: file.mimetype }),
      model: 'whisper-1',
    });
    return this.extractFromText(transcription.text);
  }

  async extractFromText(transcript: string): Promise<ExtractedItem[]> {
    const response = await this.openai.responses.parse({
      model: 'gpt-4.1-mini',
      input: [
        { role: 'system', content: 'Extract grocery or shopping items. Return JSON with an items array. Use null for unknown quantity or price. Confidence is 0 to 1.' },
        { role: 'user', content: transcript },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'extracted_items',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string' },
                    quantity: { type: ['number', 'null'] },
                    price: { type: ['number', 'null'] },
                    confidence: { type: 'number' },
                  },
                  required: ['name', 'quantity', 'price', 'confidence'],
                },
              },
            },
            required: ['items'],
          },
        },
      },
    });

    const parsed = response.output_parsed as { items: ExtractedItem[] } | null;
    return parsed?.items ?? [];
  }
}
