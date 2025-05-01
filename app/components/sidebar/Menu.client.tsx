import { motion, type Variants } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
import { ControlPanel } from '~/components/@settings/core/ControlPanel';
import { SettingsButton } from '~/components/ui/SettingsButton';
import { Button } from '~/components/ui/Button';
import { db, deleteById, getAll, chatId, type ChatHistoryItem, useChatHistory } from '~/lib/persistence';
import { cubicEasingFn } from '~/utils/easings';
import { HistoryItem } from './HistoryItem';
import { binDates } from './date-binning';
import { useSearchFilter } from '~/lib/hooks/useSearchFilter';
import { classNames } from '~/utils/classNames';
import { useStore } from '@nanostores/react';
import { profileStore } from '~/lib/stores/profile';

// Updated menu variants with smoother transitions
const menuVariants = {
  closed: {
    opacity: 0,
    visibility: 'hidden',
    left: '-340px',
    transition: {
      duration: 0.3,
      ease: cubicEasingFn,
    },
  },
  open: {
    opacity: 1,
    visibility: 'initial',
    left: 0,
    transition: {
      duration: 0.3,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

type DialogContent =
  | { type: 'delete'; item: ChatHistoryItem }
  | { type: 'bulkDelete'; items: ChatHistoryItem[] }
  | null;

// Remove CurrentDateTime component since it's no longer needed

export const Menu = () => {
  const { duplicateCurrentChat, exportChat } = useChatHistory();
  const menuRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<ChatHistoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<DialogContent>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const profile = useStore(profileStore);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Original functionality preserved
  const { filteredItems: filteredList, handleSearchChange } = useSearchFilter({
    items: list,
    searchFields: ['description'],
  });

  const loadEntries = useCallback(() => {
    if (db) {
      getAll(db)
        .then((list) => list.filter((item) => item.urlId && item.description))
        .then(setList)
        .catch((error) => toast.error(error.message));
    }
  }, []);

  // All original functionality preserved
  const deleteChat = useCallback(
    async (id: string): Promise<void> => {
      if (!db) {
        throw new Error('Database not available');
      }

      // Delete chat snapshot from localStorage
      try {
        const snapshotKey = `snapshot:${id}`;
        localStorage.removeItem(snapshotKey);
        console.log('Removed snapshot for chat:', id);
      } catch (snapshotError) {
        console.error(`Error deleting snapshot for chat ${id}:`, snapshotError);
      }

      // Delete the chat from the database
      await deleteById(db, id);
      console.log('Successfully deleted chat:', id);
    },
    [db],
  );

  const deleteItem = useCallback(
    (event: React.UIEvent, item: ChatHistoryItem) => {
      event.preventDefault();
      event.stopPropagation();

      // Log the delete operation to help debugging
      console.log('Attempting to delete chat:', { id: item.id, description: item.description });

      deleteChat(item.id)
        .then(() => {
          toast.success('Chat deleted successfully', {
            position: 'bottom-right',
            autoClose: 3000,
          });

          // Always refresh the list
          loadEntries();

          if (chatId.get() === item.id) {
            // hard page navigation to clear the stores
            console.log('Navigating away from deleted chat');
            window.location.pathname = '/';
          }
        })
        .catch((error) => {
          console.error('Failed to delete chat:', error);
          toast.error('Failed to delete conversation', {
            position: 'bottom-right',
            autoClose: 3000,
          });

          // Still try to reload entries in case data has changed
          loadEntries();
        });
    },
    [loadEntries, deleteChat],
  );

  // Preserving all other callback functions
  const deleteSelectedItems = useCallback(
    async (itemsToDeleteIds: string[]) => {
      if (!db || itemsToDeleteIds.length === 0) {
        console.log('Bulk delete skipped: No DB or no items to delete.');
        return;
      }

      console.log(`Starting bulk delete for ${itemsToDeleteIds.length} chats`, itemsToDeleteIds);

      let deletedCount = 0;
      const errors: string[] = [];
      const currentChatId = chatId.get();
      let shouldNavigate = false;

      // Process deletions sequentially using the shared deleteChat logic
      for (const id of itemsToDeleteIds) {
        try {
          await deleteChat(id);
          deletedCount++;

          if (id === currentChatId) {
            shouldNavigate = true;
          }
        } catch (error) {
          console.error(`Error deleting chat ${id}:`, error);
          errors.push(id);
        }
      }

      // Show appropriate toast message
      if (errors.length === 0) {
        toast.success(`${deletedCount} chat${deletedCount === 1 ? '' : 's'} deleted successfully`);
      } else {
        toast.warning(`Deleted ${deletedCount} of ${itemsToDeleteIds.length} chats. ${errors.length} failed.`, {
          autoClose: 5000,
        });
      }

      // Reload the list after all deletions
      await loadEntries();

      // Clear selection state
      setSelectedItems([]);
      setSelectionMode(false);

      // Navigate if needed
      if (shouldNavigate) {
        window.location.pathname = '/';
      }
    },
    [deleteChat, loadEntries, db],
  );

  const closeDialog = () => {
    setDialogContent(null);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);

    if (selectionMode) {
      // If turning selection mode OFF, clear selection
      setSelectedItems([]);
    }
  };

  const toggleItemSelection = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const newSelectedItems = prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id];
      return newSelectedItems;
    });
  }, []);

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedItems.length === 0) {
      toast.info('Select at least one chat to delete');
      return;
    }

    const selectedChats = list.filter((item) => selectedItems.includes(item.id));

    if (selectedChats.length === 0) {
      toast.error('Could not find selected chats');
      return;
    }

    setDialogContent({ type: 'bulkDelete', items: selectedChats });
  }, [selectedItems, list]);

  const selectAll = useCallback(() => {
    const allFilteredIds = filteredList.map((item) => item.id);
    setSelectedItems((prev) => {
      const allFilteredAreSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => prev.includes(id));

      if (allFilteredAreSelected) {
        // Deselect only the filtered items
        const newSelectedItems = prev.filter((id) => !allFilteredIds.includes(id));
        console.log('Deselecting all filtered items. New selection:', newSelectedItems);

        return newSelectedItems;
      } else {
        // Select all filtered items, adding them to any existing selections
        const newSelectedItems = [...new Set([...prev, ...allFilteredIds])];
        console.log('Selecting all filtered items. New selection:', newSelectedItems);

        return newSelectedItems;
      }
    });
  }, [filteredList]);

  // Preserving all original useEffect hooks
  useEffect(() => {
    if (open) {
      loadEntries();
    }
  }, [open, loadEntries]);

  useEffect(() => {
    if (!open && selectionMode) {
      console.log('Sidebar closed, preserving selection state');
    }
  }, [open, selectionMode]);

  useEffect(() => {
    const enterThreshold = 40;
    const exitThreshold = 40;

    function onMouseMove(event: MouseEvent) {
      if (isSettingsOpen) {
        return;
      }

      if (event.pageX < enterThreshold) {
        setOpen(true);
      }

      if (menuRef.current && event.clientX > menuRef.current.getBoundingClientRect().right + exitThreshold) {
        setOpen(false);
      }
    }

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [isSettingsOpen]);

  const handleDuplicate = async (id: string) => {
    await duplicateCurrentChat(id);
    loadEntries(); // Reload the list after duplication
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
    setOpen(false);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  const setDialogContentWithLogging = useCallback((content: DialogContent) => {
    console.log('Setting dialog content:', content);
    setDialogContent(content);
  }, []);

  return (
    <>
      <motion.div
        ref={menuRef}
        initial="closed"
        animate={open ? 'open' : 'closed'}
        variants={menuVariants}
        style={{ width: '340px' }}
        className={classNames(
          'flex selection-accent flex-col side-menu fixed top-0 h-full',
          'bg-[#F7F9FC] dark:bg-gray-900 border-r border-[#E4E9F2] dark:border-gray-800/50',
          'shadow-lg text-sm z-sidebar',
          isSettingsOpen ? 'z-40' : 'z-sidebar',
        )}
      >
        {/* Modern header with gradient accent */}
        <div className="relative h-16 flex items-center justify-between px-5 border-b border-[#E4E9F2] dark:border-gray-800/50 bg-white dark:bg-gray-900">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#3366FF] to-[#5E81F4]"></div>
          <div className="text-[#2E3A59] dark:text-white font-medium flex items-center gap-2">
            <span className="i-lucide:layout-dashboard h-5 w-5 text-[#3366FF]" />
            <span className="font-semibold">InitFlow</span>
          </div>
          <div className="flex items-center gap-3">
            {profile?.avatar ? (
              <div className="relative">
                <img
                  src={profile.avatar}
                  alt={profile?.username}
                  className="w-9 h-9 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
                  loading="eager"
                  decoding="sync"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
              </div>
            ) : (
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#3366FF]/10 text-[#3366FF] shadow-sm">
                <div className="i-ph:user-circle-duotone text-xl" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
          {/* Search and action buttons */}
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <a
                href="/"
                className="flex-1 flex gap-2 items-center bg-[#3366FF] text-white hover:bg-[#2952CC] rounded-lg px-4 py-2.5 transition-colors shadow-sm"
              >
                <span className="inline-block i-ph:plus-circle-duotone h-4 w-4" />
                <span className="text-sm font-medium">New Project</span>
              </a>
              <button
                onClick={toggleSelectionMode}
                className={classNames(
                  'flex gap-1 items-center rounded-lg px-3 py-2.5 transition-colors shadow-sm',
                  selectionMode
                    ? 'bg-[#3366FF] text-white'
                    : 'bg-white dark:bg-gray-800 text-[#8F9BB3] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-[#E4E9F2] dark:border-gray-700',
                )}
                aria-label={selectionMode ? 'Exit selection mode' : 'Enter selection mode'}
              >
                <span className={selectionMode ? 'i-ph:x-circle-duotone h-4 w-4' : 'i-ph:check-square-duotone h-4 w-4'} />
              </button>
            </div>
            <div className="relative w-full">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <span className="i-ph:magnifying-glass h-4 w-4 text-[#8F9BB3]" />
              </div>
              <input
                className="w-full bg-white dark:bg-gray-800 relative pl-9 pr-3 py-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3366FF]/50 text-sm text-[#2E3A59] dark:text-gray-100 placeholder-[#8F9BB3] dark:placeholder-gray-500 border border-[#E4E9F2] dark:border-gray-700 shadow-sm"
                type="search"
                placeholder="Search project..."
                onChange={handleSearchChange}
                aria-label="Search project"
              />
            </div>
          </div>

          {/* Projects section header */}
          <div className="flex items-center justify-between text-sm px-5 py-3">
            <div className="font-medium text-[#2E3A59] dark:text-gray-300">Your Projects</div>
            {selectionMode && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-[#3366FF] hover:text-[#2952CC]">
                  {selectedItems.length === filteredList.length ? 'Deselect all' : 'Select all'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDeleteClick}
                  disabled={selectedItems.length === 0}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete selected
                </Button>
              </div>
            )}
          </div>

          {/* Project list with improved styling */}
          <div className="flex-1 overflow-auto px-3 pb-3">
            {filteredList.length === 0 && (
              <div className="px-4 py-8 text-center">
                <div className="i-ph:folder-notch-open-duotone h-12 w-12 mx-auto text-[#8F9BB3] mb-2"></div>
                <div className="text-[#8F9BB3] dark:text-gray-400 text-sm">
                  {list.length === 0 ? 'No previous projects' : 'No matches found'}
                </div>
              </div>
            )}
            <DialogRoot open={dialogContent !== null}>
              {binDates(filteredList).map(({ category, items }) => (
                <div key={category} className="mt-2 first:mt-0 space-y-1">
                  <div className="text-xs font-medium text-[#8F9BB3] dark:text-gray-400 sticky top-0 z-1 bg-[#F7F9FC] dark:bg-gray-900 px-4 py-2 backdrop-blur-sm">
                    {category}
                  </div>
                  <div className="space-y-1 pr-1">
                    {items.map((item) => (
                      <HistoryItem
                        key={item.id}
                        item={item}
                        exportChat={exportChat}
                        onDelete={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          console.log('Delete triggered for item:', item);
                          setDialogContentWithLogging({ type: 'delete', item });
                        }}
                        onDuplicate={() => handleDuplicate(item.id)}
                        selectionMode={selectionMode}
                        isSelected={selectedItems.includes(item.id)}
                        onToggleSelection={toggleItemSelection}
                      />
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Preserving all dialog functionality */}
              <Dialog onBackdrop={closeDialog} onClose={closeDialog}>
                {dialogContent?.type === 'delete' && (
                  <>
                    <div className="p-6 bg-white dark:bg-gray-900">
                      <DialogTitle className="text-[#2E3A59] dark:text-white">Delete Project?</DialogTitle>
                      <DialogDescription className="mt-2 text-[#8F9BB3] dark:text-gray-400">
                        <p>
                          You are about to delete{' '}
                          <span className="font-medium text-[#2E3A59] dark:text-white">
                            {dialogContent.item.description}
                          </span>
                        </p>
                        <p className="mt-2">Are you sure you want to delete this project?</p>
                      </DialogDescription>
                    </div>
                    <div className="flex justify-end gap-3 px-6 py-4 bg-[#F7F9FC] dark:bg-gray-800 border-t border-[#E4E9F2] dark:border-gray-700">
                      <DialogButton type="secondary" onClick={closeDialog}>
                        Cancel
                      </DialogButton>
                      <DialogButton
                        type="danger"
                        onClick={(event) => {
                          console.log('Dialog delete button clicked for item:', dialogContent.item);
                          deleteItem(event, dialogContent.item);
                          closeDialog();
                        }}
                      >
                        Delete
                      </DialogButton>
                    </div>
                  </>
                )}
                {dialogContent?.type === 'bulkDelete' && (
                  <>
                    <div className="p-6 bg-white dark:bg-gray-900">
                      <DialogTitle className="text-[#2E3A59] dark:text-white">Delete Selected Projects?</DialogTitle>
                      <DialogDescription className="mt-2 text-[#8F9BB3] dark:text-gray-400">
                        <p>
                          You are about to delete {dialogContent.items.length}{' '}
                          {dialogContent.items.length === 1 ? 'project' : 'projects'}:
                        </p>
                        <div className="mt-2 max-h-32 overflow-auto border border-[#E4E9F2] dark:border-gray-700 rounded-md bg-[#F7F9FC] dark:bg-gray-800 p-2">
                          <ul className="list-disc pl-5 space-y-1">
                            {dialogContent.items.map((item) => (
                              <li key={item.id} className="text-sm">
                                <span className="font-medium text-[#2E3A59] dark:text-white">{item.description}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <p className="mt-3">Are you sure you want to delete these projects?</p>
                      </DialogDescription>
                    </div>
                    <div className="flex justify-end gap-3 px-6 py-4 bg-[#F7F9FC] dark:bg-gray-800 border-t border-[#E4E9F2] dark:border-gray-700">
                      <DialogButton type="secondary" onClick={closeDialog}>
                        Cancel
                      </DialogButton>
                      <DialogButton
                        type="danger"
                        onClick={() => {
                          const itemsToDeleteNow = [...selectedItems];
                          console.log('Bulk delete confirmed for', itemsToDeleteNow.length, 'items', itemsToDeleteNow);
                          deleteSelectedItems(itemsToDeleteNow);
                          closeDialog();
                        }}
                      >
                        Delete
                      </DialogButton>
                    </div>
                  </>
                )}
              </Dialog>
            </DialogRoot>
          </div>

          {/* Footer with settings and theme toggle */}
          <div className="flex items-center justify-between border-t border-[#E4E9F2] dark:border-gray-800 px-5 py-4 bg-white dark:bg-gray-900">
            <SettingsButton onClick={handleSettingsClick} />
            {/* Theme toggle commented out but functionality preserved */}
            {/* <ThemeSwitch /> */}
          </div>
        </div>
      </motion.div>
      <ControlPanel open={isSettingsOpen} onClose={handleSettingsClose} />
    </>
  );
};
