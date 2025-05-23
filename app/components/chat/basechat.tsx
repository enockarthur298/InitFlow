/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import type { JSONValue, Message } from 'ai';
import React, { type RefCallback, useEffect, useState } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { Menu } from '~/components/sidebar/Menu.client';
import { IconButton } from '~/components/ui/IconButton';
import { Workbench } from '~/components/workbench/Workbench.client';
import { classNames } from '~/utils/classNames';
import { PROVIDER_LIST } from '~/utils/constants';
import { Messages } from './Messages.client';
import { SendButton } from './SendButton.client';
import { APIKeyManager, getApiKeysFromCookies } from './APIKeyManager';
import Cookies from 'js-cookie';
import * as Tooltip from '@radix-ui/react-tooltip';

import styles from './BaseChat.module.scss';
import { ExportChatButton } from '~/components/chat/chatExportAndImport/ExportChatButton';
import { ImportButtons } from '~/components/chat/chatExportAndImport/ImportButtons';
import { ExamplePrompts } from '~/components/chat/ExamplePrompts';
//import GitCloneButton from './GitCloneButton';

import FilePreview from './FilePreview';
import { ModelSelector } from '~/components/chat/ModelSelector';
import { SpeechRecognitionButton } from '~/components/chat/SpeechRecognition';
import type { ProviderInfo } from '~/types/model';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { toast } from 'react-toastify';
// Remove this line
// import StarterTemplates from './StarterTemplates';
import type { ActionAlert, SupabaseAlert, DeployAlert } from '~/types/actions';
import DeployChatAlert from '~/components/deploy/DeployAlert';
import ChatAlert from './ChatAlert';
import type { ModelInfo } from '~/lib/modules/llm/types';
import ProgressCompilation from './ProgressCompilation';
import type { ProgressAnnotation } from '~/types/context';
import type { ActionRunner } from '~/lib/runtime/action-runner';
import { LOCAL_PROVIDERS } from '~/lib/stores/settings';
import { SupabaseChatAlert } from '~/components/chat/SupabaseAlert';
//import { SupabaseConnection } from './SupabaseConnection';
// Add this to the imports at the top of the file
import { useAuth } from '@clerk/remix'; 

const TEXTAREA_MIN_HEIGHT = 76;

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  messageRef?: RefCallback<HTMLDivElement> | undefined;
  scrollRef?: RefCallback<HTMLDivElement> | undefined;
  showChat?: boolean;
  chatStarted?: boolean;
  isStreaming?: boolean;
  onStreamingChange?: (streaming: boolean) => void;
  messages?: Message[];
  description?: string;
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  input?: string;
  model?: string;
  setModel?: (model: string) => void;
  provider?: ProviderInfo;
  setProvider?: (provider: ProviderInfo) => void;
  providerList?: ProviderInfo[];
  handleStop?: () => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  enhancePrompt?: () => void;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
  exportChat?: () => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
  actionAlert?: ActionAlert;
  clearAlert?: () => void;
  supabaseAlert?: SupabaseAlert;
  clearSupabaseAlert?: () => void;
  deployAlert?: DeployAlert;
  clearDeployAlert?: () => void;
  data?: JSONValue[] | undefined;
  actionRunner?: ActionRunner;
  
  // Added props to match Chat.client.tsx
  setInput?: (input: string) => void;
  stop?: () => void;
  reload?: () => void;
  append?: (message: any) => void;
  setMessages?: (messages: Message[]) => void;
  setData?: (data: any) => void;
  chatData?: any;
  chatStore?: any;
  files?: any;
  supabaseConn?: any;
  selectedProject?: any;
  TEXTAREA_MAX_HEIGHT?: number;
  showAuthDialog?: boolean;
  setShowAuthDialog?: (show: boolean) => void;
  showPricingDialog?: boolean;
  setShowPricingDialog?: (show: boolean) => void;
  hasSubscription?: boolean;
  setHasSubscription?: (has: boolean) => void;
  subscriptionError?: string | null;
  setSubscriptionError?: (error: string | null) => void;
  apiKeys?: Record<string, string>;
  setApiKeys?: (keys: Record<string, string>) => void;
}

export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      textareaRef,
      messageRef,
      scrollRef,
      showChat = true,
      chatStarted = false,
      isStreaming = false,
      onStreamingChange,
      model,
      setModel,
      provider,
      setProvider,
      providerList,
      input = '',
      enhancingPrompt,
      handleInputChange,

      // promptEnhanced,
      enhancePrompt,
      sendMessage,
      handleStop,
      importChat,
      exportChat,
      uploadedFiles = [],
      setUploadedFiles,
      imageDataList = [],
      setImageDataList,
      messages,
      actionAlert,
      clearAlert,
      deployAlert,
      clearDeployAlert,
      supabaseAlert,
      clearSupabaseAlert,
      data,
      actionRunner,
    },
    ref,
  ) => {
    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;
    const [apiKeys, setApiKeys] = useState<Record<string, string>>(getApiKeysFromCookies());
    const [modelList, setModelList] = useState<ModelInfo[]>([]);
    const [isModelSettingsCollapsed, setIsModelSettingsCollapsed] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
    const [transcript, setTranscript] = useState('');
    const [isModelLoading, setIsModelLoading] = useState<string | undefined>('all');
    const [progressAnnotations, setProgressAnnotations] = useState<ProgressAnnotation[]>([]);
    const [isLoading, setIsLoading] = useState(false); // Add missing isLoading state

    useEffect(() => {
      if (data) {
        // Fix the data type issue with proper type assertion
        const typedData = data as any[];
        const progressList = typedData.filter(
          (x) => typeof x === 'object' && (x as any).type === 'progress',
        ) as ProgressAnnotation[];
        setProgressAnnotations(progressList);
      }
    }, [data]);
    useEffect(() => {
      console.log(transcript);
    }, [transcript]);

    useEffect(() => {
      onStreamingChange?.(isStreaming);
    }, [isStreaming, onStreamingChange]);

    useEffect(() => {
      if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join('');

          setTranscript(transcript);

          if (handleInputChange) {
            const syntheticEvent = {
              target: { value: transcript },
            } as React.ChangeEvent<HTMLTextAreaElement>;
            handleInputChange(syntheticEvent);
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        setRecognition(recognition);
      }
    }, []);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        let parsedApiKeys: Record<string, string> | undefined = {};

        try {
          parsedApiKeys = getApiKeysFromCookies();
          setApiKeys(parsedApiKeys);
        } catch (error) {
          
          Cookies.remove('apiKeys');
        }

        setIsModelLoading('all');
        fetch('/api/models')
          .then((response) => response.json())
          .then((data) => {
            const typedData = data as { modelList: ModelInfo[] };
            setModelList(typedData.modelList);
          })
          .catch((error) => {
            console.error('Error fetching model list:', error);
          })
          .finally(() => {
            setIsModelLoading(undefined);
          });
      }
    }, [providerList, provider]);

    const onApiKeysChange = async (providerName: string, apiKey: string) => {
      const newApiKeys = { ...apiKeys, [providerName]: apiKey };
      setApiKeys(newApiKeys);
      Cookies.set('apiKeys', JSON.stringify(newApiKeys));

      setIsModelLoading(providerName);

      let providerModels: ModelInfo[] = [];

      try {
        const response = await fetch(`/api/models/${encodeURIComponent(providerName)}`);
        const data = await response.json();
        providerModels = (data as { modelList: ModelInfo[] }).modelList;
      } catch (error) {
        console.error('Error loading dynamic models for:', providerName, error);
      }

      // Only update models for the specific provider
      setModelList((prevModels) => {
        const otherModels = prevModels.filter((model) => model.provider !== providerName);
        return [...otherModels, ...providerModels];
      });
      setIsModelLoading(undefined);
    };

    const startListening = () => {
      if (recognition) {
        recognition.start();
        setIsListening(true);
      }
    };

    const stopListening = () => {
      if (recognition) {
        recognition.stop();
        setIsListening(false);
      }
    };

    // Change from '@clerk/remix' to '@clerk/clerk-react'

    // Inside the BaseChat component, add these state variables
    const { isSignedIn, userId } = useAuth();
    const [hasSubscription, setHasSubscription] = useState(false);
    const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
    const [showPricingDialog, setShowPricingDialog] = useState(false);
    
    // Check subscription status when user signs in
    useEffect(() => {
      const checkUserSubscription = async () => {
        if (!isSignedIn || !userId) {
          console.log('User not signed in, setting hasSubscription to false');
          setHasSubscription(false);
          return;
        }
        
        console.log('Checking subscription for user:', userId);
        setIsCheckingSubscription(true);
        
        try {
          // First register the user to ensure they exist in our database
          await fetch('/api/users/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: userId }),
          });
          
          // Now check subscription status
          const response = await fetch(`/api/check-subscription?user_id=${userId}`);
          
          if (!response.ok) {
            console.error('Subscription check failed:', response.statusText);
            setHasSubscription(false);
            return;
          }
          
          const data = await response.json() as { has_active_subscription: boolean };
          console.log('Subscription check response:', data);
          setHasSubscription(data.has_active_subscription);
          
          // If subscription check failed but we should have one, try again after a delay
          if (!data.has_active_subscription) {
            // Try again after 3 seconds in case the webhook is still processing
            setTimeout(async () => {
              console.log('Retrying subscription check...');
              const retryResponse = await fetch(`/api/check-subscription?user_id=${userId}`);
              if (retryResponse.ok) {
                const retryData = await retryResponse.json() as { has_active_subscription: boolean };
                console.log('Retry subscription check response:', retryData);
                setHasSubscription(retryData.has_active_subscription);
              }
            }, 3000);
          }
        } catch (error) {
          console.error('Error checking subscription:', error);
          // For development purposes, you can set this to true
          setHasSubscription(false);
        } finally {
          setIsCheckingSubscription(false);
        }
      };
      
      checkUserSubscription();
    }, [isSignedIn, userId]);
    
    // Update the handleSendMessage function to check subscription
    const handleSendMessage = async (event: React.UIEvent, messageInput?: string) => {
      // Prevent default behavior
      event.preventDefault();
      
      console.log('handleSendMessage called, isSignedIn:', isSignedIn, 'hasSubscription:', hasSubscription);
      
      if (!isSignedIn) {
        // Show auth dialog if not signed in
        console.log('User not signed in, showing auth dialog');
        setShowAuthDialog(true);
        return;
      }
      
      if (!hasSubscription) {
        // Show pricing dialog if not subscribed
        console.log('User has no subscription, showing pricing dialog');
        // Force dialog to appear by using a direct approach
        setShowPricingDialog(true);
        console.log('showPricingDialog set to true');
        
        // Force a dialog to appear directly from this component
        // This is a fallback in case the state change doesn't propagate correctly
        const dialogElement = document.createElement('div');
        dialogElement.id = 'emergency-subscription-dialog';
        dialogElement.style.position = 'fixed';
        dialogElement.style.top = '0';
        dialogElement.style.left = '0';
        dialogElement.style.width = '100%';
        dialogElement.style.height = '100%';
        dialogElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        dialogElement.style.zIndex = '99999';
        dialogElement.style.display = 'flex';
        dialogElement.style.justifyContent = 'center';
        dialogElement.style.alignItems = 'center';
        
        const dialogContent = document.createElement('div');
        dialogContent.style.backgroundColor = 'white';
        dialogContent.style.padding = '20px';
        dialogContent.style.borderRadius = '8px';
        dialogContent.style.maxWidth = '400px';
        dialogContent.style.width = '100%';
        dialogContent.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        dialogContent.style.border = '2px solid #3b82f6';
        
        dialogContent.innerHTML = `
          <h2 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 1rem; color: #2563eb;">Subscription Required</h2>
          <p style="margin-bottom: 1.5rem;">You need an active subscription to send messages. Would you like to subscribe now?</p>
          <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
            <button id="cancel-subscription-dialog" style="padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-radius: 0.25rem; cursor: pointer;">Cancel</button>
            <button id="view-pricing" style="padding: 0.5rem 1rem; background-color: #2563eb; color: white; border: none; border-radius: 0.25rem; cursor: pointer;">View Pricing</button>
          </div>
        `;
        
        dialogElement.appendChild(dialogContent);
        document.body.appendChild(dialogElement);
        
        // Add event listeners
        document.getElementById('cancel-subscription-dialog')?.addEventListener('click', () => {
          document.body.removeChild(dialogElement);
          setShowPricingDialog(false);
        });
        
        document.getElementById('view-pricing')?.addEventListener('click', () => {
          document.body.removeChild(dialogElement);
          window.location.href = '/pricing';
        });
        
        
                return;
      }
      
      // Continue with the existing send message logic
      if (sendMessage) {
        sendMessage(event, messageInput);
        
        if (recognition) {
          recognition.abort();
          setTranscript('');
          setIsListening(false);
          
          if (handleInputChange) {
            const syntheticEvent = {
              target: { value: '' },
            } as React.ChangeEvent<HTMLTextAreaElement>;
            handleInputChange(syntheticEvent);
          }
        }
      }
    };

    const handleFileUpload = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];

        if (file) {
          const reader = new FileReader();

          reader.onload = (e) => {
            const base64Image = e.target?.result as string;
            setUploadedFiles?.([...uploadedFiles, file]);
            setImageDataList?.([...imageDataList, base64Image]);
          };
          reader.readAsDataURL(file);
        }
      };

      input.click();
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;

      if (!items) {
        return;
      }

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();

          const file = item.getAsFile();

          if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
              const base64Image = e.target?.result as string;
              setUploadedFiles?.([...uploadedFiles, file]);
              setImageDataList?.([...imageDataList, base64Image]);
            };
            reader.readAsDataURL(file);
          }

          break;
        }
      }
    };

    const baseChat = (
      <div
        ref={ref}
        className={classNames(styles.BaseChat, 'relative flex h-full w-full overflow-hidden')}
        data-chat-visible={showChat}
      >
        <ClientOnly>{() => <Menu />}</ClientOnly>
        <div ref={scrollRef} className="flex flex-col lg:flex-row overflow-y-auto w-full h-full">
          <div className={classNames(styles.Chat, 'flex flex-col flex-grow lg:min-w-[var(--chat-min-width)] h-full')}>
            {!chatStarted && (
              <div id="intro" className="mt-[16vh] max-w-chat mx-auto text-center px-4 lg:px-0">
                <h1 className="text-3xl lg:text-6xl font-bold mb-4 animate-fade-in bg-gradient-to-r from-[#7B61FF] to-[#1A73E8] bg-clip-text text-transparent">
                  InitFlow
                </h1>
                <p className="text-md lg:text-xl mb-8 text-bolt-elements-textSecondary animate-fade-in animation-delay-200">
                  Describe your dream website, and we will help you build it step by step
                </p>
              </div>
            )}
            <div
              className={classNames('pt-6 px-2 sm:px-6', {
                'h-full flex flex-col': chatStarted,
              })}
              ref={scrollRef}
            >
              <ClientOnly>
                {() => {
                  return chatStarted ? (
                    <Messages
                      ref={messageRef}
                      className="flex flex-col w-full flex-1 max-w-chat pb-6 mx-auto z-1"
                      messages={messages}
                      isStreaming={isStreaming}
                    />
                  ) : null;
                }}
              </ClientOnly>
              {deployAlert && (
                <DeployChatAlert
                  alert={deployAlert}
                  clearAlert={() => clearDeployAlert?.()}
                  postMessage={(message: string | undefined) => {
                    sendMessage?.({} as any, message);
                    clearSupabaseAlert?.();
                  }}
                />
              )}
              {supabaseAlert && (
                <SupabaseChatAlert
                  alert={supabaseAlert}
                  clearAlert={() => clearSupabaseAlert?.()}
                  postMessage={(message) => {
                    sendMessage?.({} as any, message);
                    clearSupabaseAlert?.();
                  }}
                />
              )}
              <div
                className={classNames('flex flex-col gap-4 w-full max-w-chat mx-auto z-prompt mb-6', {
                  'sticky bottom-2': chatStarted,
                })}
              >
                <div className="bg-bolt-elements-background-depth-2">
                  {actionAlert && (
                    <ChatAlert
                      alert={actionAlert}
                      clearAlert={() => clearAlert?.()}
                      postMessage={(message) => {
                        sendMessage?.({} as any, message);
                        clearAlert?.();
                      }}
                    />
                  )}
                </div>
                {progressAnnotations && <ProgressCompilation data={progressAnnotations} />}
                <div
                  className={classNames(
                    'bg-bolt-elements-background-depth-2 p-3 rounded-lg border border-bolt-elements-borderColor relative w-full max-w-chat mx-auto z-prompt',

                    /*
                     * {
                     *   'sticky bottom-2': chatStarted,
                     * },
                     */
                  )}
                >
                  <svg className={classNames(styles.PromptEffectContainer)}>
                    <defs>
                      <linearGradient
                        id="line-gradient"
                        x1="20%"
                        y1="0%"
                        x2="-14%"
                        y2="10%"
                        gradientUnits="userSpaceOnUse"
                        gradientTransform="rotate(-45)"
                      >
                        <stop offset="0%" stopColor="#b44aff" stopOpacity="0%"></stop>
                        <stop offset="40%" stopColor="#b44aff" stopOpacity="80%"></stop>
                        <stop offset="50%" stopColor="#b44aff" stopOpacity="80%"></stop>
                        <stop offset="100%" stopColor="#b44aff" stopOpacity="0%"></stop>
                      </linearGradient>
                      <linearGradient id="shine-gradient">
                        <stop offset="0%" stopColor="white" stopOpacity="0%"></stop>
                        <stop offset="40%" stopColor="#ffffff" stopOpacity="80%"></stop>
                        <stop offset="50%" stopColor="#ffffff" stopOpacity="80%"></stop>
                        <stop offset="100%" stopColor="white" stopOpacity="0%"></stop>
                      </linearGradient>
                    </defs>
                    <rect className={classNames(styles.PromptEffectLine)} pathLength="100" strokeLinecap="round"></rect>
                    <rect className={classNames(styles.PromptShine)} x="48" y="24" width="70" height="1"></rect>
                  </svg>
                  <div>
                    <ClientOnly>
                      {() => (
                        <div className={isModelSettingsCollapsed ? 'hidden' : ''}>
                          <ModelSelector
                            key={provider?.name + ':' + modelList.length}
                            model={model}
                            setModel={setModel}
                            modelList={modelList}
                            provider={provider}
                            setProvider={setProvider}
                            providerList={providerList || (PROVIDER_LIST as ProviderInfo[])}
                            apiKeys={apiKeys}
                            modelLoading={isModelLoading}
                          />
                          {(providerList || []).length > 0 &&
                            provider &&
                            (!LOCAL_PROVIDERS.includes(provider.name) || 'OpenAILike') && (
                              <APIKeyManager
                                provider={provider}
                                apiKey={apiKeys[provider.name] || ''}
                                setApiKey={(key) => {
                                  onApiKeysChange(provider.name, key);
                                }}
                              />
                            )}
                        </div>
                      )}
                    </ClientOnly>
                  </div>
                  <FilePreview
                    files={uploadedFiles}
                    imageDataList={imageDataList}
                    onRemove={(index) => {
                      setUploadedFiles?.(uploadedFiles.filter((_, i) => i !== index));
                      setImageDataList?.(imageDataList.filter((_, i) => i !== index));
                    }}
                  />
                  <ClientOnly>
                    {() => (
                      <ScreenshotStateManager
                        setUploadedFiles={setUploadedFiles}
                        setImageDataList={setImageDataList}
                        uploadedFiles={uploadedFiles}
                        imageDataList={imageDataList}
                      />
                    )}
                  </ClientOnly>
                  <div
                    className={classNames(
                      'relative shadow-lg border border-bolt-elements-borderColor backdrop-blur-md rounded-xl overflow-hidden',
                      'bg-gradient-to-b from-bolt-elements-background-depth-2/50 to-bolt-elements-background-depth-2/80',
                    )}
                  >
                    <textarea
                      ref={textareaRef}
                      className={classNames(
                        'w-full pl-5 pt-5 pr-16 outline-none resize-none',
                        'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary/60',
                        'bg-transparent text-sm backdrop-blur-sm',
                        'transition-all duration-300',
                        'focus:ring-2 focus:ring-purple-500/20',
                      )}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.border = '2px solid #1488fc';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.border = '2px solid #1488fc';
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';

                        const files = Array.from(e.dataTransfer.files);
                        files.forEach((file) => {
                          if (file.type.startsWith('image/')) {
                            const reader = new FileReader();

                            reader.onload = (e) => {
                              const base64Image = e.target?.result as string;
                              setUploadedFiles?.([...uploadedFiles, file]);
                              setImageDataList?.([...imageDataList, base64Image]);
                            };
                            reader.readAsDataURL(file);
                          }
                        });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          if (event.shiftKey) {
                            return;
                          }

                          event.preventDefault();

                          if (isStreaming) {
                            handleStop?.();
                            return;
                          }

                          // ignore if using input method engine
                          if (event.nativeEvent.isComposing) {
                            return;
                          }

                          handleSendMessage?.(event);
                        }
                      }}
                      value={input}
                      onChange={(event) => {
                        handleInputChange?.(event);
                      }}
                      onPaste={handlePaste}
                      style={{
                        minHeight: TEXTAREA_MIN_HEIGHT,
                        maxHeight: TEXTAREA_MAX_HEIGHT,
                      }}
                      placeholder="What website do you want to build?"
                      translate="no"
                      />
                   <ClientOnly>
                      {() => (
                        // In the BaseChat component, update where the SendButton is rendered
                        <SendButton
                          show={!!input.trim()}
                          isStreaming={isStreaming}
                          disabled={isLoading || !input.trim()}
                          hasSubscription={hasSubscription}
                          isCheckingSubscription={isCheckingSubscription}
                          onClick={handleSendMessage}
                        />
                      )}
                    </ClientOnly>
                    <div className="flex justify-between items-center text-sm p-4 pt-2 bg-bolt-elements-background-depth-1/30 backdrop-blur-sm">
                      <div className="flex gap-2 items-center">
                        <IconButton 
                          title="Upload file" 
                          className="transition-all hover:bg-purple-500/10 active:scale-95" 
                          onClick={() => handleFileUpload()}
                        >
                          <div className="i-ph:upload text-xl"></div>
                        </IconButton>
                        
                        {chatStarted && <ClientOnly>{() => <ExportChatButton />}</ClientOnly>}
                        <IconButton
                          title="Model Settings"
                          className={classNames('transition-all flex items-center gap-1', {
                            'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent':
                              isModelSettingsCollapsed,
                            'bg-bolt-elements-item-backgroundDefault text-bolt-elements-item-contentDefault':
                              !isModelSettingsCollapsed,
                          })}
                          onClick={() => setIsModelSettingsCollapsed(!isModelSettingsCollapsed)}
                          disabled={!providerList || providerList.length === 0}
                        >
                          <div className={`i-ph:caret-${isModelSettingsCollapsed ? 'right' : 'down'} text-lg`} />
                          {isModelSettingsCollapsed ? <span className="text-xs">{model}</span> : <span />}
                        </IconButton>
                      </div>
                      {input.length > 3 ? (
                        <div className="text-xs text-bolt-elements-textTertiary">
                          Use <kbd className="kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">Shift</kbd>{' '}
                          + <kbd className="kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">Return</kbd>{' '}
                          a new line
                        </div>
                      ) : null}
                      {/* SupabaseConnection removed from here */}
                    </div>
                  </div>
                  
                  {/* Example Prompts - Moved here from bottom of chat */}
                  {!chatStarted && (
                    <div className="mt-4">
                      {ExamplePrompts((event: React.UIEvent, messageInput?: string) => {
                        if (isStreaming) {
                          handleStop?.();
                          return;
                        }
                        handleSendMessage?.(event, messageInput);
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-center gap-5 pb-16">
              {!chatStarted && (
                <>
                  <div className="flex items-center justify-center gap-4 w-full my-2">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent"></div>
                    <span className="text-base font-medium text-gray-500 dark:text-gray-400 px-6 py-1 rounded-full bg-gray-50/50 dark:bg-gray-900/50">
                    
                    </span>
                
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-gray-200 dark:via-gray-800 to-transparent"></div>
                  </div>
                  <div className="flex justify-center gap-2">
                    {/* Remove importChat prop from ImportButtons */}
                    {ImportButtons()}
                    {/* Remove importChat prop from GitCloneButton if present */}
                    {/* <GitCloneButton /> */}
                  </div>
                </>
              )}
              {/* Removed ExamplePrompts from here as it's now placed above */}
            </div>

            
          </div>
          <ClientOnly>
            {() => (
              <Workbench
                actionRunner={actionRunner ?? ({} as ActionRunner)}
                chatStarted={chatStarted}
                isStreaming={isStreaming}
              />
            )}
          </ClientOnly>
        </div>
      </div>
    );

    return <Tooltip.Provider delayDuration={200}>{baseChat}</Tooltip.Provider>;
  },
);

function setShowAuthDialog(arg0: boolean) {
  throw new Error('Function not implemented.');
}
