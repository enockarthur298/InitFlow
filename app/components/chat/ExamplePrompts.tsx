import React from 'react';
import { useAuth } from '@clerk/remix';

// Interface for the sendMessage function with additional showAuthDialog parameter
interface SendMessageFunction {
  (event: React.UIEvent, messageInput?: string): void | undefined;
  showAuthDialog?: () => void;
}

const EXAMPLE_PROMPTS = [
  { text: 'Build a real estate listings site with interactive maps' },
  { text: 'Design a modern personal portfolio website' },
  { text: 'Develop a social media dashboard with engagement metrics' },
  { text: 'Create an e-commerce product page with image gallery' },
];

export function ExamplePrompts(sendMessage?: SendMessageFunction) {
  const { isSignedIn } = useAuth(); // Get authentication status

  // Handle template selection with auth check
  const handleTemplateClick = (event: React.UIEvent, promptText: string) => {
    if (!isSignedIn && sendMessage?.showAuthDialog) {
      // Show auth dialog if user is not signed in
      sendMessage.showAuthDialog();
      return;
    }
    
    // Otherwise proceed with sending the message
    sendMessage?.(event, promptText);
  };

  return (
    <div id="examples" className="relative flex flex-col gap-6 w-full max-w-3xl mx-auto mt-8">
      <div className="text-center mb-4">
        <h3 className="text-sm font-medium text-bolt-elements-textSecondary uppercase tracking-wider">
          Quick Start Templates
        </h3>
      </div>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-4"
        style={{
          animation: '.25s ease-out 0s 1 _fade-and-move-in_g2ptj_1 forwards',
        }}
      >
        {EXAMPLE_PROMPTS.map((examplePrompt, index: number) => {
          return (
            <button
              key={index}
              onClick={(event) => handleTemplateClick(event, examplePrompt.text)}
              className={`
                group relative overflow-hidden rounded-lg border border-bolt-elements-borderColor/30
                bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3
                px-4 py-3 text-sm transition-all duration-300
                hover:shadow-[0_4px_12px_rgba(123,97,255,0.15)]
                hover:border-[#7B61FF]/50
                hover:scale-[1.02]
              `}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#7B61FF]/5 to-[#1A73E8]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 text-bolt-elements-textSecondary group-hover:text-bolt-elements-textPrimary transition-colors duration-200">
                {examplePrompt.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}