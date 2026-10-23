import { useCallback, useRef, useState } from 'react';

import { chatLesson } from '../services/lessonApi.js';

const historyForApi = (messages) =>
  messages
    .filter(
      (message) =>
        message.role === 'student' ||
        (message.role === 'tutor' && message.complete)
    )
    .map(({ role, content }) => ({ role, content }))
    .slice(-20);

export function useChatStream({ lesson, apiKey, onProgress }) {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const controller = useRef(null);
  const send = useCallback(
    async ({ message, start }) => {
      if (isStreaming || (!start && !message?.trim())) {
        return;
      }
      setError(null);
      const messageId = crypto.randomUUID();
      const priorMessages = messages;
      if (!start) {
        setMessages((current) => [
          ...current,
          { id: crypto.randomUUID(), role: 'student', content: message.trim() },
        ]);
      }
      setMessages((current) => [
        ...current,
        {
          id: messageId,
          role: 'tutor',
          content: '',
          sourceIds: [],
          complete: false,
        },
      ]);
      setIsStreaming(true);
      controller.current = new AbortController();
      try {
        await chatLesson({
          signal: controller.current.signal,
          body: {
            lessonId: lesson.lessonId,
            lessonState: lesson.lessonState,
            conversationHistory: historyForApi(priorMessages),
            ...(start ? { start: true } : { message: message.trim() }),
            ...(apiKey?.trim() ? { apiKey: apiKey.trim() } : {}),
          },
          onEvent: (type, data) => {
            if (type === 'delta') {
              setMessages((current) =>
                current.map((item) =>
                  item.id === messageId
                    ? { ...item, content: item.content + (data.text || '') }
                    : item
                )
              );
            } else if (type === 'sources') {
              setMessages((current) =>
                current.map((item) =>
                  item.id === messageId
                    ? {
                        ...item,
                        sourceIds: Array.isArray(data.sourceIds)
                          ? data.sourceIds
                          : [],
                      }
                    : item
                )
              );
            } else if (
              type === 'progress' &&
              data.lessonState &&
              data.progress
            ) {
              onProgress(data);
            } else if (type === 'error') {
              throw new Error(
                data?.error?.message || 'Unable to generate a tutor response.'
              );
            } else if (type === 'done') {
              setMessages((current) =>
                current.map((item) =>
                  item.id === messageId ? { ...item, complete: true } : item
                )
              );
            }
          },
        });
      } catch (requestError) {
        const interrupted = requestError.name === 'AbortError';
        setMessages((current) =>
          current.map((item) =>
            item.id === messageId
              ? { ...item, complete: true, interrupted }
              : item
          )
        );
        if (!interrupted) {
          setError(requestError.message);
        }
      } finally {
        controller.current = null;
        setIsStreaming(false);
      }
    },
    [apiKey, isStreaming, lesson, messages, onProgress]
  );
  return {
    messages,
    isStreaming,
    error,
    send,
    stop: useCallback(() => controller.current?.abort(), []),
  };
}
