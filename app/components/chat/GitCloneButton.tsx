import ignore from 'ignore';
import { useGit } from '~/lib/hooks/useGit';
import type { Message } from 'ai';
import { detectProjectCommands, createCommandsMessage, escapeBoltTags } from '~/utils/projectCommands';
import { generateId } from '~/utils/fileUtils';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { LoadingOverlay } from '~/components/ui/LoadingOverlay';
import { RepositorySelectionDialog } from '~/components/@settings/tabs/connections/components/RepositorySelectionDialog';
import { classNames } from '~/utils/classNames';
import { Button } from '~/components/ui/Button';
import type { IChatMetadata } from '~/lib/persistence/db';

const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  '.github/**',
  '.vscode/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '.cache/**',
  '.idea/**',
  '**/*.log',
  '**/.DS_Store',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
  '**/*lock.json',
  '**/*lock.yaml',
];

const ig = ignore().add(IGNORE_PATTERNS);

const MAX_FILE_SIZE = 100 * 1024; // 100KB limit per file
const MAX_TOTAL_SIZE = 500 * 1024; // 500KB total limit

interface GitCloneButtonProps {
  className?: string;
  id?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  importChat?: (description: string, messages: Message[], metadata?: IChatMetadata) => Promise<void>;
}

export default function GitCloneButton({ 
  importChat, 
  className, 
  id = 'git-clone-button',
  isOpen = false,
  onOpenChange
}: GitCloneButtonProps) {
  const { ready, gitClone } = useGit();
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(isOpen);

  useEffect(() => {
    setIsDialogOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isDialogOpen);
    }
  }, [isDialogOpen, onOpenChange]);

  const handleClone = async (repoUrl: string) => {
    if (!ready) {
      return;
    }

    setLoading(true);

    try {
      const { workdir, data } = await gitClone(repoUrl);

      if (importChat) {
        const filePaths = Object.keys(data).filter((filePath) => !ig.ignores(filePath));
        const textDecoder = new TextDecoder('utf-8');

        let totalSize = 0;
        const skippedFiles: string[] = [];
        const fileContents = [];

        for (const filePath of filePaths) {
          const { data: content, encoding } = data[filePath];

          // Skip binary files
          if (
            content instanceof Uint8Array &&
            !filePath.match(/\.(txt|md|astro|mjs|js|jsx|ts|tsx|json|html|css|scss|less|yml|yaml|xml|svg|vue|svelte)$/i)
          ) {
            skippedFiles.push(filePath);
            continue;
          }

          try {
            const textContent =
              encoding === 'utf8' ? content : content instanceof Uint8Array ? textDecoder.decode(content) : '';

            if (!textContent) {
              continue;
            }

            // Check file size
            const fileSize = new TextEncoder().encode(textContent).length;

            if (fileSize > MAX_FILE_SIZE) {
              skippedFiles.push(filePath);
              continue;
            }

            totalSize += fileSize;

            if (totalSize > MAX_TOTAL_SIZE) {
              skippedFiles.push(filePath);
              continue;
            }

            fileContents.push({
              path: filePath,
              content: textContent,
            });
          } catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
            skippedFiles.push(filePath);
          }
        }

        // Detect project commands
        const commands = await detectProjectCommands(fileContents);

        // Create messages
        const messages: Message[] = [
          {
            id: generateId(),
            role: 'user',
            content: `I've cloned the repository from ${repoUrl}. Here are the files:\n\n${fileContents
              .map((file) => `**${file.path}**\n\`\`\`\n${escapeBoltTags(file.content)}\n\`\`\`\n`)
              .join('\n')}`,
          },
        ];

        // Add commands message if available
        if (commands.length > 0) {
          const commandMessage = createCommandsMessage(commands);
          if (commandMessage) { // Ensure commandMessage is not null
            messages.push(commandMessage);
          }
        }

        // Extract repo name from URL
        const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'Git Repository';

        // Create metadata with correct type structure
        const metadata: IChatMetadata = {
          type: 'git', // Changed from 'source' to 'type'
          repository: {
            url: repoUrl,
            name: repoName,
            fileCount: fileContents.length,
            skippedCount: skippedFiles.length,
          }
        };

        await importChat(repoName, messages, metadata);

        if (skippedFiles.length > 0) {
          toast.info(
            `Imported ${fileContents.length} files. Skipped ${skippedFiles.length} files due to size or format limitations.`,
          );
        } else {
          toast.success(`Successfully imported ${fileContents.length} files from ${repoName}`);
        }
      }
    } catch (error) {
      console.error('Failed to clone repository:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to clone repository');
    } finally {
      setLoading(false);
      setIsDialogOpen(false);
    }
  };

  // Return only the dialog and loading overlay
  // The button is removed as it's now replaced by the card-based UI
  return (
    <>
      <RepositorySelectionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSelect={handleClone}
      />

      {loading && <LoadingOverlay message="Cloning repository..." />}
    </>
  );
}
