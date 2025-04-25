import { json, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
// Removed BackgroundRays importz

export const meta: MetaFunction = () => {
  return [{ title: 'InitFlow' }, { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' }];
};

export const loader = async () => {
  return json({});
};

export default function Index() {
  return (
    // Changed background class to transparent
    <div className="flex flex-col h-full w-full bg-transparent">
      {/* Removed BackgroundRays component */}
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}
