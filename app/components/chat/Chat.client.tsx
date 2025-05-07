/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { useStore } from '@nanostores/react';
import type { Message } from 'ai';
import { useChat } from 'ai/react';
import { useAnimate } from 'framer-motion';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import { useMessageParser, usePromptEnhancer, useShortcuts, useSnapScroll } from '~/lib/hooks';
import { description, useChatHistory } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, PROMPT_COOKIE_KEY, PROVIDER_LIST } from '~/utils/constants';
import { cubicEasingFn } from '~/utils/easings';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { BaseChat } from './basechat';
import Cookies from 'js-cookie';
import { debounce } from '~/utils/debounce';
import { useSettings } from '~/lib/hooks/useSettings';
import type { ProviderInfo } from '~/types/model';
import { useSearchParams } from '@remix-run/react';
import { createSampler } from '~/utils/sampler';
import { getTemplates, selectStarterTemplate } from '~/utils/selectStarterTemplate';
import { logStore } from '~/lib/stores/logs';
import { streamingState } from '~/lib/stores/streaming';
import { filesToArtifacts } from '~/utils/fileUtils';
import { supabaseConnection } from '~/lib/stores/supabase';
import * as RadixDialog from '@radix-ui/react-dialog';
import { useAuth } from '@clerk/remix';
import { SignInButton, SignUpButton } from '@clerk/remix';
import { useNavigate } from '@remix-run/react';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

const logger = createScopedLogger('Chat');

export function Chat() {
  renderLogger.trace('Chat');

  const { ready, initialMessages, storeMessageHistory, importChat, exportChat } = useChatHistory();
  const title = useStore(description);
  useEffect(() => {
    workbenchStore.setReloadedMessages(initialMessages.map((m) => m.id));
  }, [initialMessages]);

  return (
    <>
      {ready && (
        <ChatImpl
          description={title}
          initialMessages={initialMessages}
          exportChat={exportChat}
          storeMessageHistory={storeMessageHistory}
          importChat={importChat}
        />
      )}
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <div className="i-ph:x text-lg" />
            </button>
          );
        }}
        icon={({ type }) => {
          /**
           * @todo Handle more types if we need them. This may require extra color palettes.
           */
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
            }
          }

          return undefined;
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
        autoClose={3000}
      />
    </>
  );
}

const processSampledMessages = createSampler(
  (options: {
    messages: Message[];
    initialMessages: Message[];
    isLoading: boolean;
    parseMessages: (messages: Message[], isLoading: boolean) => void;
    storeMessageHistory: (messages: Message[]) => Promise<void>;
  }) => {
    const { messages, initialMessages, isLoading, parseMessages, storeMessageHistory } = options;
    parseMessages(messages, isLoading);

    if (messages.length > initialMessages.length) {
      storeMessageHistory(messages).catch((error) => toast.error(error.message));
    }
  },
  50,
);

interface ChatProps {
  initialMessages: Message[];
  storeMessageHistory: (messages: Message[]) => Promise<void>;
  importChat: (description: string, messages: Message[]) => Promise<void>;
  exportChat: () => void;
  description?: string;
}

// Inside the ChatImpl component (or wherever useChat is called)
export const ChatImpl = memo(
  ({
    description,
    initialMessages,
    exportChat,
    storeMessageHistory,
    importChat,
  }) => {
    renderLogger.trace('ChatImpl');
    const { isSignedIn, userId } = useAuth(); // Get authentication status
    const [showAuthDialog, setShowAuthDialog] = useState(false); // State for auth dialog
    const [showPricingDialog, setShowPricingDialog] = useState(false); // State for pricing dialog
    const [hasSubscription, setHasSubscription] = useState(false); // State for subscription status
    const navigate = useNavigate(); // For navigation to pricing page

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [imageDataList, setImageDataList] = useState<string[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const [fakeLoading, setFakeLoading] = useState(false);
    const files = useStore(workbenchStore.files);
    const actionAlert = useStore(workbenchStore.alert);
    const deployAlert = useStore(workbenchStore.deployAlert);
    const supabaseConn = useStore(supabaseConnection);
    const selectedProject = supabaseConn.stats?.projects?.find(
      (project) => project.id === supabaseConn.selectedProjectId,
    );
    const supabaseAlert = useStore(workbenchStore.supabaseAlert);
    const { activeProviders, promptId, autoSelectTemplate, contextOptimizationEnabled } = useSettings();

    const [model, setModel] = useState(() => {
      const savedModel = Cookies.get('selectedModel');
      return savedModel || DEFAULT_MODEL;
    });
    const [provider, setProvider] = useState(() => {
      const savedProvider = Cookies.get('selectedProvider');
      return (PROVIDER_LIST.find((p) => p.name === savedProvider) || DEFAULT_PROVIDER) as ProviderInfo;
    });

    const { showChat } = useStore(chatStore);

    const [animationScope, animate] = useAnimate();

    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

    const {
      messages,
      isLoading,
      input,
      handleInputChange,
      setInput,
      stop,
      append,
      setMessages,
      reload,
      error,
      data: chatData,
      setData,
    } = useChat({
      api: '/api/chat',
      body: {
        apiKeys,
        files,
        promptId,
        contextOptimization: contextOptimizationEnabled,
        supabase: {
          isConnected: supabaseConn.isConnected,
          hasSelectedProject: !!selectedProject,
          credentials: {
            supabaseUrl: supabaseConn?.credentials?.supabaseUrl,
            anonKey: supabaseConn?.credentials?.anonKey,
          },
        },
      },
      sendExtraMessageFields: true,
      onError: (e) => {
        logger.error('Request failed\n\n', e, error);
        logStore.logError('Chat request failed', e, {
          component: 'Chat',
          action: 'request',
          error: e.message,
        });
        toast.error(
          'There was an error processing your request: ' + (e.message ? e.message : 'No details were returned'),
        );
      },
      onFinish: (message, response) => {
        const usage = response.usage;
        setData(undefined);

        if (usage) {
          console.log('Token usage:', usage);
          logStore.logProvider('Chat response completed', {
            component: 'Chat',
            action: 'response',
            model,
            provider: provider.name,
            usage,
            messageLength: message.content.length,
          });
        }

        logger.debug('Finished streaming');
      },
      initialMessages,
      initialInput: Cookies.get(PROMPT_COOKIE_KEY) || '',
    });

    // Check if user has an active subscription
    const checkSubscription = useCallback(async () => {
      if (!isSignedIn || !userId) return false;
      
      try {
        // Replace with your actual subscription check API endpoint
        const response = await fetch('/api/check-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });
        
        if (!response.ok) {
          return false;
        }
        
        const data = await response.json();
        return data.hasActiveSubscription;
      } catch (error) {
        console.error('Error checking subscription:', error);
        return false;
      }
    }, [isSignedIn, userId]);

    // Check subscription status when user signs in
    useEffect(() => {
      if (isSignedIn) {
        checkSubscription().then(setHasSubscription);
      } else {
        setHasSubscription(false);
      }
    }, [isSignedIn, checkSubscription]);

    useEffect(() => {
      const prompt = searchParams.get('prompt');

      if (prompt) {
        setSearchParams({});
        runAnimation();
        append({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${prompt}`,
            },
          ] as any, // Type assertion to bypass compiler check
        });
      }
    }, [model, provider, searchParams]);

    const { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer } = usePromptEnhancer();
    const { parsedMessages, parseMessages } = useMessageParser();

    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

    useEffect(() => {
      chatStore.setKey('started', initialMessages.length > 0);
    }, []);

    useEffect(() => {
      processSampledMessages({
        messages,
        initialMessages,
        isLoading,
        parseMessages,
        storeMessageHistory,
      });
    }, [messages, isLoading, parseMessages]);

    const scrollTextArea = () => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    };

    const abort = () => {
      stop();
      chatStore.setKey('aborted', true);
      workbenchStore.abortAllActions();

      logStore.logProvider('Chat response aborted', {
        component: 'Chat',
        action: 'abort',
        model,
        provider: provider.name,
      });
    };

    useEffect(() => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.style.height = 'auto';

        const scrollHeight = textarea.scrollHeight;

        textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
        textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
      }
    }, [input, textareaRef]);

    const runAnimation = async () => {
      if (chatStarted) {
        return;
      }

      await Promise.all([
        animate('#examples', { opacity: 0, display: 'none' }, { duration: 0.1 }),
        animate('#intro', { opacity: 0, flex: 1 }, { duration: 0.2, ease: cubicEasingFn }),
      ]);

      chatStore.setKey('started', true);

      setChatStarted(true);
    };

    const sendMessage = async (_event: React.UIEvent, messageInput?: string) => {
      // Step 1: Check if user is authenticated
      if (!isSignedIn) {
        setShowAuthDialog(true);
        return;
      }
      
      // Step 2: Check if user has an active subscription
      const subscriptionStatus = await checkSubscription();
      setHasSubscription(subscriptionStatus);
      
      if (!subscriptionStatus) {
        setShowPricingDialog(true);
        return;
      }

      const messageContent = messageInput || input;

      if (!messageContent?.trim()) {
        return;
      }

      if (isLoading) {
        abort();
        return;
      }

      runAnimation();

      if (!chatStarted) {
        setFakeLoading(true);

        if (autoSelectTemplate) {
          const { template, title } = await selectStarterTemplate({
            message: messageContent,
            model,
            provider,
          });

          if (template !== 'blank') {
            const temResp = await getTemplates(template, title).catch((e) => {
              if (e.message.includes('rate limit')) {
                toast.warning('Rate limit exceeded. Skipping starter template\n Continuing with blank template');
              } else {
                toast.warning('Failed to import starter template\n Continuing with blank template');
              }

              return null;
            });

            if (temResp) {
              const { assistantMessage, userMessage } = temResp;
              setMessages([
                {
                  id: `1-${new Date().getTime()}`,
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${messageContent}`,
                    },
                    ...imageDataList.map((imageData) => ({
                      type: 'image',
                      image: imageData,
                    })),
                  ] as any,
                },
                {
                  id: `2-${new Date().getTime()}`,
                  role: 'assistant',
                  content: assistantMessage,
                },
                {
                  id: `3-${new Date().getTime()}`,
                  role: 'user',
                  content: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${userMessage}`,
                  annotations: ['hidden'],
                },
              ]);
              reload();
              setInput('');
              Cookies.remove(PROMPT_COOKIE_KEY);

              setUploadedFiles([]);
              setImageDataList([]);

              resetEnhancer();

              textareaRef.current?.blur();
              setFakeLoading(false);

              return;
            }
          }
        }

        // If autoSelectTemplate is disabled or template selection failed, proceed with normal message
        setMessages([
          {
            id: `${new Date().getTime()}`,
            role: 'user',
            content: [
              {
                type: 'text',
                text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${messageContent}`,
              },
              ...imageDataList.map((imageData) => ({
                type: 'image',
                image: imageData,
              })),
            ] as any,
          },
        ]);
        reload();
        setFakeLoading(false);
        setInput('');
        Cookies.remove(PROMPT_COOKIE_KEY);

        setUploadedFiles([]);
        setImageDataList([]);

        resetEnhancer();

        textareaRef.current?.blur();

        return;
      }

      if (error != null) {
        setMessages(messages.slice(0, -1));
      }

      const modifiedFiles = workbenchStore.getModifiedFiles();

      chatStore.setKey('aborted', false);

      if (modifiedFiles !== undefined) {
        const userUpdateArtifact = filesToArtifacts(modifiedFiles, `${Date.now()}`);
        append({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${userUpdateArtifact}${messageContent}`,
            },
            ...imageDataList.map((imageData) => ({
              type: 'image',
              image: imageData,
            })),
          ] as any,
        });

        workbenchStore.resetAllFileModifications();
      } else {
        append({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${messageContent}`,
            },
            ...imageDataList.map((imageData) => ({
              type: 'image',
              image: imageData,
            })),
          ] as any,
        });
      }

      setInput('');
      Cookies.remove(PROMPT_COOKIE_KEY);

      setUploadedFiles([]);
      setImageDataList([]);

      resetEnhancer();

      textareaRef.current?.blur();
    };

    /**
     * Handles the change event for the textarea and updates the input state.
     * @param event - The change event from the textarea.
     */
    const onTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleInputChange(event);
    };

    /**
     * Debounced function to cache the prompt in cookies.
     * Caches the trimmed value of the textarea input after a delay to optimize performance.
     */
    const debouncedCachePrompt = useCallback(
      debounce((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const trimmedValue = event.target.value.trim();
        Cookies.set(PROMPT_COOKIE_KEY, trimmedValue, { expires: 30 });
      }, 1000),
      [],
    );

    const [messageRef, scrollRef] = useSnapScroll();

    useEffect(() => {
      const storedApiKeys = Cookies.get('apiKeys');

      if (storedApiKeys) {
        setApiKeys(JSON.parse(storedApiKeys));
      }
    }, []);

    const handleModelChange = (newModel: string) => {
      setModel(newModel);
      Cookies.set('selectedModel', newModel, { expires: 30 });
    };

    const handleProviderChange = (newProvider: ProviderInfo) => {
      setProvider(newProvider);
      Cookies.set('selectedProvider', newProvider.name, { expires: 30 });
    };

    // Navigate to pricing page
    const navigateToPricing = () => {
      navigate('/pricing');
      setShowPricingDialog(false);
    };

    return (
      <>
        <BaseChat
          ref={animationScope}
          textareaRef={textareaRef}
          input={input}
          showChat={showChat}
          chatStarted={chatStarted}
          isStreaming={isLoading || fakeLoading}
          onStreamingChange={(streaming) => {
            streamingState.set(streaming);
          }}
          enhancingPrompt={enhancingPrompt}
          promptEnhanced={promptEnhanced}
          sendMessage={sendMessage}
          model={model}
          setModel={handleModelChange}
          provider={provider}
          setProvider={handleProviderChange}
          providerList={activeProviders}
          messageRef={messageRef}
          scrollRef={scrollRef}
          handleInputChange={(e) => {
            onTextareaChange(e);
            debouncedCachePrompt(e);
          }}
          handleStop={abort}
          description={description}
          importChat={importChat}
          exportChat={exportChat}
          messages={messages.map((message, i) => {
            if (message.role === 'user') {
              return message;
            }

            return {
              ...message,
              content: parsedMessages[i] || '',
            };
          })}
          enhancePrompt={() => {
            enhancePrompt(
              input,
              (input) => {
                setInput(input);
                scrollTextArea();
              },
              model,
              provider,
              apiKeys,
            );
          }}
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          imageDataList={imageDataList}
          setImageDataList={setImageDataList}
          actionAlert={actionAlert}
          clearAlert={() => workbenchStore.clearAlert()}
          supabaseAlert={supabaseAlert}
          clearSupabaseAlert={() => workbenchStore.clearSupabaseAlert()}
          deployAlert={deployAlert}
          clearDeployAlert={() => workbenchStore.clearDeployAlert()}
          data={chatData}
        />

        {/* Authentication Required Dialog */}
        <RadixDialog.Root open={showAuthDialog} onOpenChange={setShowAuthDialog}>
          <RadixDialog.Portal>
            <RadixDialog.Overlay className="fixed inset-0 bg-[#1A1D2D]/30 backdrop-blur-sm z-50 transition-all duration-200" />
            <RadixDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-gradient-to-b from-[#F5F7FA] to-[#E4E7EB] dark:from-[#1A1D2D] dark:to-[#141625] rounded-xl border border-[#7B61FF]/20 shadow-2xl shadow-[#7B61FF]/5 z-50">
              <div className="relative p-6">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="mx-auto w-12 h-12 mb-4 rounded-full bg-bolt-primary-button/10 flex items-center justify-center">
                    <div className="i-ph:lock-key text-2xl text-bolt-primary-button" />
                  </div>
                  <RadixDialog.Title className="text-xl font-semibold text-bolt-elements-textPrimary mb-2">
                    Authentication Required
                  </RadixDialog.Title>
                  <RadixDialog.Description className="text-sm text-bolt-elements-textSecondary">
                    Sign in or create an account to continue your conversation
                  </RadixDialog.Description>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                  <SignInButton mode="modal">
                    <button
                      className="w-full px-4 py-3 rounded-lg bg-bolt-primary-button text-bolt-primary-button-foreground hover:bg-bolt-primary-button/90 transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
                      onClick={() => setShowAuthDialog(false)}
                    >
                      <div className="i-ph:sign-in text-xl" />
                      Sign In to Your Account
                    </button>
                  </SignInButton>
                  
                  <SignUpButton mode="modal">
                    <button
                      className="w-full px-4 py-3 rounded-lg border border-bolt-elements-borderColor bg-transparent hover:bg-bolt-elements-background-hover text-bolt-elements-textPrimary transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
                      onClick={() => setShowAuthDialog(false)}
                    >
                      <div className="i-ph:user-plus text-xl" />
                      Create New Account
                    </button>
                  </SignUpButton>
                </div>

                {/* Close button */}
                <RadixDialog.Close asChild>
                  <button
                    className="absolute top-4 right-4 p-2 rounded-full text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-hover transition-colors duration-200"
                    aria-label="Close"
                  >
                    <div className="i-ph:x text-xl" />
                  </button>
                </RadixDialog.Close>
              </div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        </RadixDialog.Root>

        {/* Subscription Required Dialog */}
        <RadixDialog.Root open={showPricingDialog} onOpenChange={setShowPricingDialog}>
          <RadixDialog.Portal>
            <RadixDialog.Overlay className="fixed inset-0 bg-[#1A1D2D]/30 backdrop-blur-sm z-50 transition-all duration-200" />
            <RadixDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-gradient-to-b from-[#F5F7FA] to-[#E4E7EB] dark:from-[#1A1D2D] dark:to-[#141625] rounded-xl border border-[#7B61FF]/20 shadow-2xl shadow-[#7B61FF]/5 z-50">
              <div className="relative p-6">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="mx-auto w-12 h-12 mb-4 rounded-full bg-bolt-primary-button/10 flex items-center justify-center">
                    <div className="i-ph:crown text-2xl text-bolt-primary-button" />
                  </div>
                  <RadixDialog.Title className="text-xl font-semibold text-bolt-elements-textPrimary mb-2">
                    Subscription Required
                  </RadixDialog.Title>
                  <RadixDialog.Description className="text-sm text-bolt-elements-textSecondary">
                    You need an active subscription to use this feature. Choose a plan to continue.
                  </RadixDialog.Description>
                </div>

                {/* Pricing Information */}
                <div className="mb-6 p-4 bg-bolt-elements-background-depth-1 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-bolt-elements-textPrimary">Pro Plan</span>
                    <span className="font-bold text-bolt-primary-button">$19.99/month</span>
                  </div>
                  <ul className="space-y-2 text-sm text-bolt-elements-textSecondary">
                    <li className="flex items-center">
                      <div className="i-ph:check-circle-fill text-bolt-elements-icon-success mr-2" />
                      Unlimited AI chat conversations
                    </li>
                    <li className="flex items-center">
                      <div className="i-ph:check-circle-fill text-bolt-elements-icon-success mr-2" />
                      Access to all AI models
                    </li>
                    <li className="flex items-center">
                      <div className="i-ph:check-circle-fill text-bolt-elements-icon-success mr-2" />
                      Priority support
                    </li>
                  </ul>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                  <button
                    className="w-full px-4 py-3 rounded-lg bg-bolt-primary-button text-bolt-primary-button-foreground hover:bg-bolt-primary-button/90 transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
                    onClick={navigateToPricing}
                  >
                    <div className="i-ph:lightning text-xl" />
                    View Pricing Plans
                  </button>
                  
                  <RadixDialog.Close asChild>
                    <button
                      className="w-full px-4 py-3 rounded-lg border border-bolt-elements-borderColor bg-transparent hover:bg-bolt-elements-background-hover text-bolt-elements-textPrimary transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
                    >
                      <div className="i-ph:arrow-left text-xl" />
                      Return to Chat
                    </button>
                  </RadixDialog.Close>
                </div>

                {/* Close button */}
                <RadixDialog.Close asChild>
                  <button
                    className="absolute top-4 right-4 p-2 rounded-full text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-hover transition-colors duration-200"
                    aria-label="Close"
                  >
                    <div className="i-ph:x text-xl" />
                  </button>
                </RadixDialog.Close>
              </div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        </RadixDialog.Root>
      </>
    );
  },
);
