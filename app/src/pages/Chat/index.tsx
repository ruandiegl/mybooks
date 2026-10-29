import { useThemedStyles } from '../../styles/useThemedStyles';
import { useIsFocused } from '@react-navigation/native';
import { useAvatarRefresh } from '../../features/avatar/useAvatarRefresh';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { ConnectionStateBanner } from '../../components/chat/ConnectionStateBanner';
import { ChatHeader, ChatHeaderActions } from '../../components/chat/ChatHeader';
import { Message } from '../../components/chat/Message';
import { MessageComposer } from '../../components/chat/MessageComposer';
import { MessageScroller } from '../../components/chat/MessageScroller';
import { TypingIndicator } from '../../components/chat/TypingIndicator';
import { StateView } from '../../components/StateView';
import { orderMessagePages, type MessagePages, updateMessageStatus, upsertMessage } from '../../features/chat/messageCache';
import { resolveChatEntryState } from '../../features/chat/navigation';
import { checkMatchRemovalStatus, removeMatchAfterConfirmation, type MatchRemovalStatus } from '../../features/chat/matchRemoval';
import { joinConversationIfAuthorized, leaveConversation, updateMessagesIfConversationActive } from '../../features/chat/realtime';
import { useChatRealtime } from '../../providers/ChatRealtimeProvider';
import { useSession } from '../../providers/SessionProvider';
import { api } from '../../services/api';
import type { ApiEnvelope, Conversation, Message as MessageType, Paginated, User } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { createStyles } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;
export function Chat({ route, navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const { conversationId } = route.params;
  const { captureActor, isActorCurrent } = useSession();
  const queryClient = useQueryClient();
  const { socket, connectionState, isConversationRemoved, pendingMatchRemovals, registerConfirmedMatchRemoved } = useChatRealtime();
  const [body, setBody] = useState('');
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [removalDialogVisible, setRemovalDialogVisible] = useState(false);
  const [removalStatus, setRemovalStatus] = useState<MatchRemovalStatus | null>(null);
  const [removalBusy, setRemovalBusy] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryKey = useMemo(() => ['messages', conversationId] as const, [conversationId]);
  const me = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get<ApiEnvelope<User>>('/api/v1/me')).data.data });
  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await api.get<ApiEnvelope<Conversation[]>>('/api/v1/conversations')).data.data
  });
  const conversation = conversations.data?.find((item) => item.id === conversationId);
  const isFocused = useIsFocused();
  const refreshConversationMedia = useAvatarRefresh(conversation, conversations.refetch, isFocused);
  const refreshMembership = useCallback(async () => {
    const result = await conversations.refetch();
    return result.data || [];
  }, [conversations.refetch]);
  const conversationMemberConfirmed = Boolean(conversations.data?.some((item) => item.id === conversationId));
  const conversationEnded = isConversationRemoved(conversationId) || pendingMatchRemovals.some((item) => item.conversationId === conversationId);
  const chatEntryState = resolveChatEntryState({
    isLoading: conversations.isLoading,
    isError: conversations.isError,
    containsConversation: conversationMemberConfirmed
  });
  const messages = useInfiniteQuery({
    queryKey,
    enabled: conversationMemberConfirmed && !conversationEnded,
    initialPageParam: '',
    queryFn: async ({ pageParam, signal }) => (await api.get<ApiEnvelope<Paginated<MessageType>>>(
      '/api/v1/conversations/' + conversationId + '/messages',
      { params: { limit: 30, cursor: pageParam || undefined }, signal }
    )).data.data,
    getNextPageParam: (lastPage) => lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.nextCursor || undefined : undefined
  });

  useAvatarRefresh(messages.data, messages.refetch, isFocused);

  useEffect(() => {
    let active = true;
    let joinRequested = false;
    const actor = captureActor();
    setOtherUserTyping(false);

    if (!socket || connectionState !== 'connected' || conversationEnded) {
      return () => { active = false; };
    }

    void joinConversationIfAuthorized({
      socket,
      conversationId,
      refreshMembership,
      isConversationRemoved,
      isActive: () => active && Boolean(actor && isActorCurrent(actor)),
      onJoinRequested: () => { joinRequested = true; }
    }).then((joined) => {
      if (!active) {
        if (joined) leaveConversation(socket, conversationId);
        return;
      }
      if (joined) void queryClient.invalidateQueries({ queryKey });
    }).catch(() => undefined);

    return () => {
      active = false;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = null;
      if (joinRequested) leaveConversation(socket, conversationId);
    };
  }, [captureActor, connectionState, conversationEnded, conversationId, isActorCurrent, isConversationRemoved, queryClient, queryKey, refreshMembership, socket]);

  useEffect(() => {
    if (!socket) return;
    const actor = captureActor();
    const isCurrent = () => Boolean(actor && isActorCurrent(actor));

    const onTyping = (payload: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (isCurrent() && !isConversationRemoved(conversationId) && payload.conversationId === conversationId && payload.userId !== me.data?.id) {
        setOtherUserTyping(payload.isTyping);
      }
    };
    const onMessageAck = (payload: { clientMessageId: string }) => {
      if (!isCurrent()) return;
      updateMessagesIfConversationActive(queryClient, conversationId, isConversationRemoved, (old) => updateMessageStatus(old, payload.clientMessageId, 'sent'));
    };
    const onMessageCreated = (message: MessageType) => {
      if (!isCurrent() || message.conversationId !== conversationId) return;
      updateMessagesIfConversationActive(queryClient, conversationId, isConversationRemoved, (old) => upsertMessage(old, { ...message, localStatus: 'sent' }));
    };

    socket.on('presence:typing', onTyping);
    socket.on('message:ack', onMessageAck);
    socket.on('message:created', onMessageCreated);
    return () => {
      socket.off('presence:typing', onTyping);
      socket.off('message:ack', onMessageAck);
      socket.off('message:created', onMessageCreated);
    };
  }, [captureActor, conversationId, isActorCurrent, isConversationRemoved, me.data?.id, queryClient, socket]);

  const ordered = useMemo(() => orderMessagePages(messages.data), [messages.data]);

  const openRemovalDialog = useCallback(() => {
    if (!conversation) return;
    setRemovalStatus(null);
    setRemovalDialogVisible(true);
  }, [conversation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Conversa',
      headerTitle: conversation
        ? () => <ChatHeader subjectId={conversation.otherUser.id} name={conversation.otherUser.name} avatarUrl={conversation.otherUser.avatarUrl} avatarVersion={conversation.otherUser.avatarVersion} onImageError={refreshConversationMedia} onPress={() => navigation.navigate('PublicProfile', { userId: conversation.otherUser.id, conversationId })} />
        : 'Conversa',
      headerRight: () => <ChatHeaderActions
        disabled={!conversation}
        onRemoveMatch={openRemovalDialog}
      />
    });
  }, [conversation, conversationId, navigation, openRemovalDialog]);

  const closeRemovalDialog = useCallback(() => {
    if (removalBusy) return;
    setRemovalDialogVisible(false);
    setRemovalStatus(null);
  }, [removalBusy]);

  const confirmRemoval = useCallback(async () => {
    if (!conversation || removalBusy) return;
    setRemovalBusy(true);
    const result = await removeMatchAfterConfirmation({
      confirmed: true,
      conversationId,
      deleteMatch: async () => {
        const response = await api.delete('/api/v1/matches/' + conversation.matchId);
        return { status: response.status };
      },
      getConversations: async () => (await api.get<ApiEnvelope<Conversation[]>>('/api/v1/conversations')).data.data.map(({ id }) => ({ id }))
    });
    setRemovalBusy(false);

    if (result.status === 'removed') {
      registerConfirmedMatchRemoved({ matchId: conversation.matchId, conversationId });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['gamification', 'leaderboard', 'matches'] });
      setRemovalDialogVisible(false);
      setRemovalStatus(null);
      return;
    }

    setRemovalStatus(result.status);
  }, [conversation, conversationId, queryClient, registerConfirmedMatchRemoved, removalBusy]);

  const checkRemoval = useCallback(async () => {
    if (!conversation || removalBusy) return;
    setRemovalBusy(true);
    const result = await checkMatchRemovalStatus({
      conversationId,
      getConversations: async () => (await api.get<ApiEnvelope<Conversation[]>>('/api/v1/conversations')).data.data.map(({ id }) => ({ id }))
    });
    setRemovalBusy(false);

    if (result.status === 'removed') {
      registerConfirmedMatchRemoved({ matchId: conversation.matchId, conversationId });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['gamification', 'leaderboard', 'matches'] });
      setRemovalDialogVisible(false);
      setRemovalStatus(null);
      return;
    }

    setRemovalStatus(result.status);
  }, [conversation, conversationId, queryClient, registerConfirmedMatchRemoved, removalBusy]);

  function updateMessages(updater: (old: MessagePages | undefined) => MessagePages | undefined) {
    return updateMessagesIfConversationActive(queryClient, conversationId, isConversationRemoved, updater);
  }

  function setStatus(clientMessageId: string, status: NonNullable<MessageType['localStatus']>) {
    updateMessages((old) => updateMessageStatus(old, clientMessageId, status));
  }

  async function deliver(message: MessageType) {
    const owner = captureActor();
    if (!owner || !isActorCurrent(owner)) return;
    if (!updateMessages((old) => updateMessageStatus(old, message.clientMessageId, 'sending'))) return;
    try {
      if (socket?.connected) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Tempo de envio excedido.')), 10000);
          socket.emit('message:send', { conversationId, clientMessageId: message.clientMessageId, body: message.body }, (response: { ok: boolean; error?: { message?: string } }) => {
            clearTimeout(timeout);
            if (response.ok) resolve();
            else reject(new Error(response.error?.message || 'Mensagem recusada.'));
          });
        });
        if (isActorCurrent(owner) && !isConversationRemoved(conversationId)) setStatus(message.clientMessageId, 'sent');
      } else {
        const saved = (await api.post<ApiEnvelope<MessageType>>('/api/v1/conversations/' + conversationId + '/messages', { clientMessageId: message.clientMessageId, body: message.body })).data.data;
        if (!isActorCurrent(owner)) return;
        updateMessages((old) => upsertMessage(old, { ...saved, localStatus: 'sent' }));
      }
    } catch {
      if (!isActorCurrent(owner) || isConversationRemoved(conversationId)) return;
      updateMessages((old) => {
        const current = old?.pages.flatMap((page) => page.items).find((item) => item.clientMessageId === message.clientMessageId);
        return current?.localStatus === 'sent' ? old : updateMessageStatus(old, message.clientMessageId, 'failed');
      });
    }
  }

  function send() {
    const text = body.trim();
    if (!text || !me.data || !conversationMemberConfirmed || conversationEnded) return;
    const clientMessageId = Crypto.randomUUID();
    const optimistic: MessageType = {
      id: clientMessageId,
      clientMessageId,
      conversationId,
      senderId: me.data.id,
      body: text,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      localStatus: 'sending'
    };
    setBody('');
    stopTyping();
    updateMessages((old) => upsertMessage(old, optimistic));
    void deliver(optimistic);
  }

  function stopTyping() {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = null;
    if (socket?.connected && !isConversationRemoved(conversationId)) {
      socket.emit('presence:typing', { conversationId, isTyping: false });
    }
  }

  function changeBody(value: string) {
    setBody(value);
    if (!socket?.connected || !value.trim() || conversationEnded) {
      stopTyping();
      return;
    }
    socket.emit('presence:typing', { conversationId, isTyping: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 1200);
  }

  if (chatEntryState === 'loading') return <View style={styles.page}><StateView loading title="Validando conversa" /></View>;
  if (chatEntryState === 'retry') return <View style={styles.page}><StateView title="Não foi possível validar a conversa" description="Confira sua conexão e tente carregar a lista de conversas novamente." icon="cloud-off" actionLabel="Tentar novamente" onAction={() => conversations.refetch()} /></View>;
  if (conversationEnded || chatEntryState === 'unavailable') return <View style={styles.page}><StateView title="Conversa não disponível" description="Esta conversa não está mais disponível para sua conta." icon="forum" /></View>;
  if (messages.isLoading) return <View style={styles.page}><StateView loading title="Carregando conversa" /></View>;
  if (messages.isError) return <View style={styles.page}><StateView title="Não foi possível carregar a conversa" icon="cloud-off" actionLabel="Tentar novamente" onAction={() => messages.refetch()} /></View>;

  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
    <ConnectionStateBanner state={connectionState} />
    <MessageScroller>
      {messages.hasNextPage ? <Pressable accessibilityRole="button" disabled={messages.isFetchingNextPage} onPress={() => messages.fetchNextPage()} style={styles.older}><Text style={styles.olderText}>{messages.isFetchingNextPage ? 'Carregando…' : 'Carregar mensagens anteriores'}</Text></Pressable> : null}
      {ordered.length ? ordered.map((message) => <Message key={message.id} message={message} currentUserId={me.data?.id} onRetry={deliver} />) : <StateView title="Comece a conversa" description="Um oi e uma proposta clara são um ótimo começo." icon="waving-hand" />}
      {otherUserTyping ? <TypingIndicator /> : null}
    </MessageScroller>
    <MessageComposer value={body} disabled={!me.data || !conversationMemberConfirmed || conversationEnded} onChangeText={changeBody} onBlur={stopTyping} onSend={send} />
    <MatchRemovalDialog
      visible={removalDialogVisible}
      status={removalStatus}
      busy={removalBusy}
      onClose={closeRemovalDialog}
      onConfirm={confirmRemoval}
      onCheck={checkRemoval}
    />
  </KeyboardAvoidingView>;
}

type RemovalDialogProps = {
  visible: boolean;
  status: MatchRemovalStatus | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCheck: () => void;
};

function MatchRemovalDialog({ visible, status, busy, onClose, onConfirm, onCheck }: RemovalDialogProps) {
  const styles = useThemedStyles(createStyles);
  const message = status === 'still-active'
    ? 'A conversa ainda aparece na sua conta. Você pode tentar remover o match novamente.'
    : status === 'uncertain'
      ? 'Não foi possível confirmar se a remoção terminou. Verifique novamente antes de continuar.'
      : 'A remoção encerra a conversa para as duas pessoas e apaga permanentemente o histórico de mensagens.';
  const actionLabel = status === 'still-active' ? 'Tentar novamente' : status === 'uncertain' ? 'Verificar novamente' : 'Remover match';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.dialogOverlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar confirmação" disabled={busy} style={styles.dialogBackdrop} onPress={onClose} />
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text accessibilityRole="header" style={styles.dialogTitle}>{status ? 'Verifique a remoção' : 'Remover match?'}</Text>
          <Text style={styles.dialogMessage}>{message}</Text>
          <View style={styles.dialogActions}>
            <AppButton label={status ? 'Fechar' : 'Cancelar'} variant="outline" disabled={busy} onPress={onClose} style={styles.dialogButton} />
            <AppButton label={actionLabel} loading={busy} onPress={status === 'uncertain' ? onCheck : onConfirm} style={styles.dialogButton} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
