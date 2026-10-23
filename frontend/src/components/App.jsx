import { useCallback, useRef, useState } from 'react';

import { ApiKeyProvider, useApiKey } from '../context/ApiKeyContext.jsx';
import { createLesson } from '../services/lessonApi.js';
import { LessonWorkspace } from './lesson/LessonWorkspace.jsx';
import { SetupPage } from './setup/SetupPage.jsx';

function TeachFlowApp() {
  const { apiKey, setApiKey } = useApiKey();
  const [lesson, setLesson] = useState(null);
  const [creationError, setCreationError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const creationController = useRef(null);

  const handleCreate = useCallback(
    async ({ file, teacherPrompt }) => {
      setCreationError(null);
      setIsCreating(true);
      creationController.current = new AbortController();
      try {
        const result = await createLesson({
          file,
          teacherPrompt,
          apiKey,
          signal: creationController.current.signal,
        });
        setLesson(result);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setCreationError(error.message);
        }
      } finally {
        setIsCreating(false);
        creationController.current = null;
      }
    },
    [apiKey]
  );

  return lesson ? (
    <LessonWorkspace
      initialLesson={lesson}
      apiKey={apiKey}
      onExit={() => setLesson(null)}
    />
  ) : (
    <SetupPage
      apiKey={apiKey}
      onApiKeyChange={setApiKey}
      onCreate={handleCreate}
      isCreating={isCreating}
      error={creationError}
    />
  );
}

export default function App() {
  return (
    <ApiKeyProvider>
      <TeachFlowApp />
    </ApiKeyProvider>
  );
}
