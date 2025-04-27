import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
// Import Clerk components
import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut } from '@clerk/remix';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames('flex items-center p-5 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary">
        <div className="i-ph:sidebar-simple-duotone text-xl" />
        {/* Logo placeholder - removed existing logo */}
        <a href="/" className="text-2xl font-semibold text-accent flex items-center">
          {/* Your logo will go here */}
        </a>
        {/* Moved chat description here */}
        {chat.started && (
          <span className="ml-4 text-bolt-elements-textPrimary">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
        )}
      </div>

      {/* Conditional rendering for action buttons only */}
      {chat.started && (
        <ClientOnly>
          {() => (
            <div className="ml-auto mr-1">
              <HeaderActionButtons />
            </div>
          )}
        </ClientOnly>
      )}

      {/* Authentication section */}
      <div className={classNames("flex items-center gap-4", {
        "pl-4": chat.started
      })}>
        <SignedOut>
          <div className="flex items-center gap-4">
            <SignInButton mode="modal">
              <button
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7B61FF] to-[#1A73E8] 
                  text-white font-medium hover:opacity-90 transition-all duration-200 
                  flex items-center justify-center gap-2 shadow-[0_4px_20px_-4px_rgba(123,97,255,0.3)]
                  hover:shadow-[0_4px_20px_-4px_rgba(123,97,255,0.5)]"
              >
                <div className="i-ph:sign-in text-lg" />
                Sign In
              </button>
            </SignInButton>
            
            <SignUpButton mode="modal">
              <button
                className="px-4 py-2 rounded-xl border-2 border-[#7B61FF]/20 
                  bg-white/50 dark:bg-[#1A1D2D]/50 hover:bg-[#7B61FF]/5 
                  text-[#1A1D2D] dark:text-white font-medium transition-all duration-200 
                  flex items-center justify-center gap-2
                  hover:border-[#7B61FF]/40 hover:shadow-[0_4px_20px_-4px_rgba(123,97,255,0.2)]"
              >
                <div className="i-ph:user-plus text-lg" />
                Sign Up
              </button>
            </SignUpButton>
          </div>
        </SignedOut>
        
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </header>
  );
}