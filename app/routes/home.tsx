import { json, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
// Removed BackgroundRays import

export const meta: MetaFunction = () => {
  return [{ title: 'Bolt - Chat' }, { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' }];
};

export const loader = async () => {
  return json({});
};

export default function Home() {
  return (
    // Changed background class to a solid color (white) instead of the depth-1 background
    <div className="flex flex-col h-full w-full bg-white">
      {/* Removed BackgroundRays component */}
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}