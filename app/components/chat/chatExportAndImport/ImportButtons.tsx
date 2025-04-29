import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { ImportFolderButton } from '~/components/chat/ImportFolderButton';
import { Button } from '~/components/ui/Button';
import { classNames } from '~/utils/classNames';
import { useState } from 'react';
import GitCloneButton from '~/components/chat/GitCloneButton';

type ChatData = {
  messages?: Message[]; // Standard Bolt format
  description?: string; // Optional description
};

export function ImportButtons(importChat: ((description: string, messages: Message[]) => Promise<void>) | undefined) {
  const [isImporting, setIsImporting] = useState(false);
  const [isGitDialogOpen, setIsGitDialogOpen] = useState(false);

  const handleImportClick = () => {
    const input = document.getElementById('chat-import');
    input?.click();
  };

  const handleFolderImportClick = () => {
    const input = document.getElementById('folder-import');
    input?.click();
  };

  const handleGitImportClick = () => {
    setIsGitDialogOpen(true);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto px-4">
      <input
        type="file"
        id="chat-import"
        className="hidden"
        accept=".json"
        onChange={async (e) => {
          const file = e.target.files?.[0];

          if (file && importChat) {
            setIsImporting(true);
            try {
              const reader = new FileReader();

              reader.onload = async (e) => {
                try {
                  const content = e.target?.result as string;
                  const data = JSON.parse(content) as ChatData;

                  // Standard format
                  if (Array.isArray(data.messages)) {
                    await importChat(data.description || 'Imported Chat', data.messages);
                    toast.success('Chat imported successfully');
                    setIsImporting(false);
                    return;
                  }

                  toast.error('Invalid chat file format');
                  setIsImporting(false);
                } catch (error: unknown) {
                  if (error instanceof Error) {
                    toast.error('Failed to parse chat file: ' + error.message);
                  } else {
                    toast.error('Failed to parse chat file');
                  }
                  setIsImporting(false);
                }
              };
              reader.onerror = () => {
                toast.error('Failed to read chat file');
                setIsImporting(false);
              };
              reader.readAsText(file);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Failed to import chat');
              setIsImporting(false);
            }
            e.target.value = ''; // Reset file input
          } else {
            toast.error('Something went wrong');
          }
        }}
      />

      {/* Card Grid Layout - Reordered cards as requested */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full mx-auto my-3">
        {/* Import Folder Card - Now first position */}
        <div 
          className={classNames(
            'flex flex-col p-2.5 rounded-lg cursor-pointer transition-all duration-150',
            'bg-[#F7F9FC] dark:bg-bolt-elements-background-depth-2',
            'hover:shadow-md hover:scale-[1.02]',
            'border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]'
          )}
          onClick={handleFolderImportClick}
          role="button"
          tabIndex={0}
          aria-label="Import project folder"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleFolderImportClick();
            }
          }}
        >
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-[#EDF1F7] dark:bg-bolt-elements-background-depth-3 mb-1.5">
            <span className="i-ph:folder-open w-3.5 h-3.5 text-[#3366FF]" />
          </div>
          <h3 className="text-sm font-semibold mb-1 text-bolt-elements-textPrimary">Import Folder</h3>
          <p className="text-xs text-[#8F9BB3] dark:text-bolt-elements-textSecondary mb-1.5 leading-tight">
            Import a local project folder to analyze its contents
          </p>
          <div className="mt-auto">
            <span className="text-xs text-[#3366FF] dark:text-blue-400 flex items-center">
              Select folder
              <span className="i-ph:arrow-right ml-1 w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Clone Git Repo Card - Now second position */}
        <div 
          className={classNames(
            'flex flex-col p-2.5 rounded-lg cursor-pointer transition-all duration-150',
            'bg-[#F7F9FC] dark:bg-bolt-elements-background-depth-2',
            'hover:shadow-md hover:scale-[1.02]',
            'border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]'
          )}
          onClick={handleGitImportClick}
          role="button"
          tabIndex={0}
          aria-label="Clone a Git repository"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleGitImportClick();
            }
          }}
        >
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-[#EDF1F7] dark:bg-bolt-elements-background-depth-3 mb-1.5">
            <span className="i-ph:git-branch w-3.5 h-3.5 text-[#3366FF]" />
          </div>
          <h3 className="text-sm font-semibold mb-1 text-bolt-elements-textPrimary">Clone Git Repo</h3>
          <p className="text-xs text-[#8F9BB3] dark:text-bolt-elements-textSecondary mb-1.5 leading-tight">
            Clone and analyze a Git repository from GitHub or other services
          </p>
          <div className="mt-auto">
            <span className="text-xs text-[#3366FF] dark:text-blue-400 flex items-center">
              Enter URL
              <span className="i-ph:arrow-right ml-1 w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Import Chat Card - Now third/last position */}
        <div 
          className={classNames(
            'flex flex-col p-2.5 rounded-lg cursor-pointer transition-all duration-150',
            'bg-[#F7F9FC] dark:bg-bolt-elements-background-depth-2',
            'hover:shadow-md hover:scale-[1.02]',
            'border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]',
            isImporting ? 'opacity-70 pointer-events-none' : ''
          )}
          onClick={handleImportClick}
          role="button"
          tabIndex={0}
          aria-label="Import chat from file"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleImportClick();
            }
          }}
        >
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-[#EDF1F7] dark:bg-bolt-elements-background-depth-3 mb-1.5">
            {isImporting ? (
              <span className="i-ph:spinner animate-spin w-3.5 h-3.5 text-[#3366FF]" />
            ) : (
              <span className="i-ph:upload-simple w-3.5 h-3.5 text-[#3366FF]" />
            )}
          </div>
          <h3 className="text-sm font-semibold mb-1 text-bolt-elements-textPrimary">Import Chat</h3>
          <p className="text-xs text-[#8F9BB3] dark:text-bolt-elements-textSecondary mb-1.5 leading-tight">
            Import a previously exported chat file in JSON format
          </p>
          <div className="mt-auto">
            <span className="text-xs text-[#3366FF] dark:text-blue-400 flex items-center">
              Select file
              <span className="i-ph:arrow-right ml-1 w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Hidden components for functionality */}
      <div className="hidden">
        <ImportFolderButton
          id="folder-import"
          importChat={importChat}
          className="hidden"
        />
        <GitCloneButton 
          id="git-clone-button"
          importChat={importChat}
          isOpen={isGitDialogOpen}
          onOpenChange={setIsGitDialogOpen}
        />
      </div>
    </div>
  );
}
