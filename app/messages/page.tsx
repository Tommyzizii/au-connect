"use client";

import { Suspense } from "react";
import ConversationsPane from "./components/ConversationsPane";
import ChatPane from "./components/ChatPane";
import { useMessaging } from "./util/useMessaging";
import VerificationRequiredModal from "@/app/components/VerificationRequiredModal";

function MessagesPageContent() {
  const {
    activeActorKey,
    activeActorType,
    verificationModalOpen,
    setVerificationModalOpen,
    inbox,
    selectedUserId,
    selectedConversationId,
    selectedInitialUnreadCount,
    activeMessages,
    messageInput,
    setMessageInput,
    showChatMobile,
    setShowChatMobile,
    isAtBottomRef,
    openChatWith,
    sendMessage,
    loadOlder,
    hasMoreOlder,
    loadingOlder,
    retryMessage,
    deleteLocalMessage,
    getRowPreview,
    draftPeer,
    deleteMessageForEveryone,
    clearConversation,
  } = useMessaging();

  const selectedRow =
    inbox.find((x) => x.conversationId === selectedConversationId) ??
    inbox.find((x) => x.peer.id === selectedUserId) ?? null;

  const headerName =
    selectedRow?.peer.name ??
    draftPeer?.username ??
    "Messages";

  const headerPic =
    selectedRow?.peer.profilePic ??
    draftPeer?.profilePic ??
    null;
  const headerPeerType = selectedRow?.peer.type ?? draftPeer?.type ?? "USER";
  const headerPeerSlug = selectedRow?.peer.slug ?? null;

  return (
    <div className="max-w-7xl mx-auto h-[calc(100dvh-97px)] overflow-hidden px-0 py-0 md:px-4 md:pt-6 md:pb-0">
      <div className="grid grid-cols-12 gap-0 md:gap-6 h-full overflow-hidden">
        <ConversationsPane
          activeActorType={activeActorType}
          inbox={inbox}
          selectedUserId={selectedUserId}
          showChatMobile={showChatMobile}
          onOpen={openChatWith}
          getRowPreview={getRowPreview}
        />

        <ChatPane
          key={activeActorKey}
          showChatMobile={showChatMobile}
          onBackMobile={() => setShowChatMobile(false)}
          selectedName={headerName}
          selectedProfilePic={headerPic}
          activeActorType={activeActorType}
          selectedPeerType={headerPeerType}
          selectedPeerSlug={headerPeerSlug}
          selectedUserId={selectedUserId}
          selectedConversationId={selectedConversationId}
          selectedUnreadCount={selectedInitialUnreadCount}
          messages={activeMessages}
          messageInput={messageInput}
          setMessageInput={setMessageInput}
          onSend={sendMessage}
          isAtBottomRef={isAtBottomRef}
          onLoadOlder={loadOlder}
          hasMoreOlder={hasMoreOlder}
          loadingOlder={loadingOlder}
          onRetryMessage={retryMessage}
          onDeleteLocalMessage={deleteLocalMessage}
          onDeleteForEveryone={deleteMessageForEveryone}
          onClearConversation={clearConversation}
        />
      </div>

      <VerificationRequiredModal
        open={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        action="send messages"
      />
    </div>
  );
}

export default function MessagePages() {
  return (
    <Suspense fallback={null}>
      <MessagesPageContent />
    </Suspense>
  );
}
