"use client";

import ConversationsPane from "./components/ConversationsPane";
import ChatPane from "./components/ChatPane";
import { useMessaging } from "./util/useMessaging";

export default function MessagePages() {
  const {
    inbox,
    selectedUserId,
    selectedConversationId,
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
    inbox.find((x) => x.user.id === selectedUserId) ?? null;

  const headerName =
    selectedRow?.user.username ??
    draftPeer?.username ??
    "Messages";

  const headerPic =
    selectedRow?.user.profilePic ??
    draftPeer?.profilePic ??
    null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-97px)] overflow-hidden">
        <ConversationsPane
          inbox={inbox}
          selectedUserId={selectedUserId}
          showChatMobile={showChatMobile}
          onOpen={openChatWith}
          getRowPreview={getRowPreview}
        />

        <ChatPane
          showChatMobile={showChatMobile}
          onBackMobile={() => setShowChatMobile(false)}
          selectedName={headerName}
          selectedProfilePic={headerPic}
          selectedUserId={selectedUserId}
          selectedConversationId={selectedConversationId}
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
    </div>
  );
}
