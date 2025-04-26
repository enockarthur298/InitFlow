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
      <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer">
        <div className="i-ph:sidebar-simple-duotone text-xl" />
        <a href="/" className="text-2xl font-semibold text-accent flex items-center">
          <img src="/logo-light-styled.png" alt="logo" className="w-[90px] inline-block dark:hidden" />
          <img src="/logo-dark-styled.png" alt="logo" className="w-[90px] inline-block hidden dark:block" />
        </a>
      </div>

      {/* Conditional rendering for chat description and action buttons */}
      {chat.started && (
        <>
          <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="mr-1">
                <HeaderActionButtons />
              </div>
            )}
          </ClientOnly>
        </>
      )}

      {/* Authentication Buttons - Placed towards the right */}
      <div className={classNames("ml-auto flex items-center gap-4", {
          "pl-4": chat.started // Add some padding if chat elements are present
      })}>
        <SignedOut>
          <SignInButton mode="modal">
            {/* You might want to style this button to match your theme */}
            <button className="px-3 py-1.5 rounded text-sm bg-bolt-primary-button text-bolt-primary-button-foreground hover:bg-bolt-primary-button/90">Sign In</button>
          </SignInButton>
          <SignUpButton mode="modal">
             {/* You might want to style this button to match your theme */}
            <button className="px-3 py-1.5 rounded text-sm border border-bolt-elements-borderColor text-bolt-elements-textPrimary hover:bg-bolt-elements-background-hover">Sign Up</button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </header>
  );
}
