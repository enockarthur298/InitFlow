import { json, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/basechat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
// Removed BackgroundRays importz
import {
  SignInButton,
  SignOutButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/remix";


export const meta: MetaFunction = () => {
  return [{ title: 'InitFlow' }, { name: 'description', content: 'Build Full-Stack apps in minute' }];
};

export const loader = async () => {
  return json({});
};

export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-gradient-to-br from-[#F5F7FA] to-[#E4E7EB] dark:from-[#1A1D2D] dark:to-[#141625]">
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}