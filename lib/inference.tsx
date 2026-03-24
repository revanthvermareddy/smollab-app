import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { initLlama, type LlamaContext as LlamaCppContext } from 'llama.rn';
import { useModels } from './model-context';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface InferenceState {
  isModelLoaded: boolean;
  isLoadingModel: boolean;
  isGenerating: boolean;
  loadError: string | null;
  messages: ChatMessage[];
  loadModel: () => Promise<void>;
  unloadModel: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  stopGeneration: () => void;
  clearChat: () => void;
  partialResponse: string;
}

const InferenceContext = createContext<InferenceState | null>(null);

export function useInference() {
  const ctx = useContext(InferenceContext);
  if (!ctx) throw new Error('useInference must be used within InferenceProvider');
  return ctx;
}

const SYSTEM_PROMPT = 'You are a helpful, friendly AI assistant running locally on the user\'s device. Be concise in your responses.';

const STOP_WORDS = ['</s>', '<|end|>', '<|eot_id|>', '<|end_of_text|>', '<|im_end|>', '<|EOT|>', '<|END_OF_TURN_TOKEN|>', '<|end_of_turn|>', '<|endoftext|>', '<end_of_turn>'];

export function InferenceProvider({ children }: { children: React.ReactNode }) {
  const { activeModel } = useModels();
  const contextRef = useRef<LlamaCppContext | null>(null);
  const abortRef = useRef(false);

  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partialResponse, setPartialResponse] = useState('');

  const unloadModel = useCallback(async () => {
    if (contextRef.current) {
      await contextRef.current.release();
      contextRef.current = null;
    }
    setIsModelLoaded(false);
    setLoadError(null);
  }, []);

  const loadModel = useCallback(async () => {
    if (!activeModel) {
      setLoadError('No model selected');
      return;
    }

    setIsLoadingModel(true);
    setLoadError(null);

    try {
      // Release any existing context
      if (contextRef.current) {
        await contextRef.current.release();
        contextRef.current = null;
      }

      const context = await initLlama({
        model: activeModel.filepath,
        use_mlock: true,
        n_ctx: 2048,
        n_gpu_layers: 99,
        n_batch: 512,
      });

      contextRef.current = context;
      setIsModelLoaded(true);
    } catch (err: any) {
      console.error('Failed to load model:', err);
      setLoadError(err?.message ?? 'Failed to load model');
      setIsModelLoaded(false);
    } finally {
      setIsLoadingModel(false);
    }
  }, [activeModel]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!contextRef.current || isGenerating) return;

      const userMsg: ChatMessage = { role: 'user', content: text };
      const allMessages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
        userMsg,
      ];

      setMessages((prev) => [...prev, userMsg]);
      setIsGenerating(true);
      setPartialResponse('');
      abortRef.current = false;

      try {
        const result = await contextRef.current.completion(
          {
            messages: allMessages,
            n_predict: 512,
            stop: STOP_WORDS,
            temperature: 0.7,
            top_p: 0.9,
          },
          (data: { token: string }) => {
            if (abortRef.current) return;
            setPartialResponse((prev) => prev + data.token);
          },
        );

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: result.text.trim(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        if (!abortRef.current) {
          console.error('Generation error:', err);
          const errorMsg: ChatMessage = {
            role: 'assistant',
            content: `Error: ${err?.message ?? 'Generation failed'}`,
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } finally {
        setIsGenerating(false);
        setPartialResponse('');
      }
    },
    [messages, isGenerating],
  );

  const stopGeneration = useCallback(() => {
    abortRef.current = true;
    if (contextRef.current) {
      contextRef.current.stopCompletion();
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setPartialResponse('');
  }, []);

  return (
    <InferenceContext.Provider
      value={{
        isModelLoaded,
        isLoadingModel,
        isGenerating,
        loadError,
        messages,
        loadModel,
        unloadModel,
        sendMessage,
        stopGeneration,
        clearChat,
        partialResponse,
      }}
    >
      {children}
    </InferenceContext.Provider>
  );
}
