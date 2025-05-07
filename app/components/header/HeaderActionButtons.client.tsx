import { useStore } from '@nanostores/react';
import useViewport from '~/lib/hooks';
import { chatStore } from '~/lib/stores/chat';
import { netlifyConnection } from '~/lib/stores/netlify';
import { vercelConnection } from '~/lib/stores/vercel';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { useEffect, useRef, useState } from 'react';
import { streamingState } from '~/lib/stores/streaming';
import { NetlifyDeploymentLink } from '~/components/chat/NetlifyDeploymentLink.client';
import { VercelDeploymentLink } from '~/components/chat/VercelDeploymentLink.client';
import { useVercelDeploy } from '~/components/deploy/VercelDeploy.client';
import { useNetlifyDeploy } from '~/components/deploy/NetlifyDeploy.client';
import { SupabaseConnection } from '~/components/chat/SupabaseConnection';

interface HeaderActionButtonsProps {}

export function HeaderActionButtons({}: HeaderActionButtonsProps) {
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const { showChat } = useStore(chatStore);
  const netlifyConn = useStore(netlifyConnection);
  const vercelConn = useStore(vercelConnection);
  const [activePreviewIndex] = useState(0);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployingTo, setDeployingTo] = useState<'netlify' | 'vercel' | null>(null);
  const isSmallViewport = useViewport(1024);
  const canHideChat = showWorkbench || !showChat;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isStreaming = useStore(streamingState);
  const { handleVercelDeploy } = useVercelDeploy();
  const { handleNetlifyDeploy } = useNetlifyDeploy();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onVercelDeploy = async () => {
    setIsDeploying(true);
    setDeployingTo('vercel');

    try {
      await handleVercelDeploy();
    } finally {
      setIsDeploying(false);
      setDeployingTo(null);
    }
  };

  const onNetlifyDeploy = async () => {
    setIsDeploying(true);
    setDeployingTo('netlify');

    try {
      await handleNetlifyDeploy();
    } finally {
      setIsDeploying(false);
      setDeployingTo(null);
    }
  };

  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
  const connectionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (connectionsRef.current && !connectionsRef.current.contains(event.target as Node)) {
        setIsConnectionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex">
      <div className="relative" ref={dropdownRef}>
        <div className="flex border border-[#E4E9F2] dark:border-gray-700 rounded-md overflow-hidden mr-2 text-sm shadow-sm">
          <Button
            active
            disabled={isDeploying || !activePreview || isStreaming}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-4 bg-[#3366FF] text-white flex items-center gap-2 font-medium transition-all duration-200"
          >
            {isDeploying ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin i-ph:circle-notch w-4 h-4" />
                <span>{`Publishing to ${deployingTo}...`}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="i-ph:rocket-launch w-4 h-4" />
                <span>Publish</span>
              </div>
            )}
            <div
              className={classNames('i-ph:caret-down w-4 h-4 transition-transform', isDropdownOpen ? 'rotate-180' : '')}
            />
          </Button>
        </div>

        {isDropdownOpen && (
          <div className="absolute right-2 flex flex-col gap-1 z-50 p-1 mt-1 min-w-[13.5rem] bg-white dark:bg-gray-900 rounded-md shadow-lg border border-[#E4E9F2] dark:border-gray-700">
            <Button
              active={false}
              onClick={() => {
                onNetlifyDeploy();
                setIsDropdownOpen(false);
              }}
              disabled={isDeploying || !activePreview || !netlifyConn.user}
              className="flex items-center w-full px-4 py-2 text-sm text-[#2E3A59] dark:text-white bg-white dark:bg-gray-900 gap-2 rounded-md group relative transition-colors"
            >
              <img
                className="w-5 h-5"
                height="24"
                width="24"
                crossOrigin="anonymous"
                src="https://cdn.simpleicons.org/netlify"
              />
              <span className="mx-auto font-medium">
                {!netlifyConn.user ? 'No Netlify Account Connected' : 'Publish to Netlify'}
              </span>
              {netlifyConn.user && <NetlifyDeploymentLink />}
            </Button>
            <Button
              active={false}
              onClick={() => {
                onVercelDeploy();
                setIsDropdownOpen(false);
              }}
              disabled={isDeploying || !activePreview || !vercelConn.user}
              className="flex items-center w-full px-4 py-2 text-sm text-[#2E3A59] dark:text-white hover:bg-[#EDF1FC] dark:hover:bg-[#3366FF]/10 gap-2 rounded-md group relative transition-colors"
            >
              <img
                className="w-5 h-5 bg-black p-1 rounded"
                height="24"
                width="24"
                crossOrigin="anonymous"
                src="https://cdn.simpleicons.org/vercel/white"
                alt="vercel"
              />
              <span className="mx-auto font-medium">{!vercelConn.user ? 'No Vercel Account Connected' : 'Publish to Vercel'}</span>
              {vercelConn.user && <VercelDeploymentLink />}
            </Button>
            {/* Cloudflare option removed */}
          </div>
        )}
      </div>

      {/* Connections button and dropdown */}
      <div className="relative" ref={connectionsRef}>
        <div className="flex border border-[#E4E9F2] dark:border-gray-700 rounded-md overflow-hidden mr-2 text-sm shadow-sm">
          <Button
            active
            onClick={() => setIsConnectionsOpen(!isConnectionsOpen)}
            className="px-4 bg-[#3366FF] text-white flex items-center gap-2 font-medium transition-all duration-200"
          >
            <div className="flex items-center gap-2">
              <div className="i-ph:plugs-connected w-4 h-4" />
              <span>Connections</span>
            </div>
            <div
              className={classNames('i-ph:caret-down w-4 h-4 transition-transform', isConnectionsOpen ? 'rotate-180' : '')}
            />
          </Button>
        </div>

        {isConnectionsOpen && (
          <div className="absolute right-2 flex flex-col gap-1 z-50 p-1 mt-1 min-w-[13.5rem] bg-white dark:bg-gray-900 rounded-md shadow-lg border border-[#E4E9F2] dark:border-gray-700">
            <Button
              active={false}
              onClick={() => document.dispatchEvent(new CustomEvent('open-supabase-connection'))}
              className="flex items-center w-full px-4 py-2 text-sm text-[#2E3A59] dark:text-white hover:bg-[#EDF1FC] dark:hover:bg-[#3366FF]/10 gap-2 rounded-md group relative transition-colors"
            >
              <span className="mx-auto font-medium">Supabase</span>
              <SupabaseConnection />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ButtonProps {
  active?: boolean;
  disabled?: boolean;
  children?: any;
  onClick?: VoidFunction;
  className?: string;
}

function Button({ active = false, disabled = false, children, onClick, className }: ButtonProps) {
  return (
    <button
      className={classNames(
        'flex items-center p-1.5',
        {
          'bg-bolt-elements-item-backgroundDefault hover:bg-bolt-elements-item-backgroundActive text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary':
            !active && !className,
          'bg-bolt-elements-item-backgroundAccent text-[#3366FF]': active && !disabled && !className,
          'bg-bolt-elements-item-backgroundDefault text-alpha-gray-20 dark:text-alpha-white-20 cursor-not-allowed':
            disabled,
        },
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

