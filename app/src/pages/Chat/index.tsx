import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import type { Socket } from 'socket.io-client';
import { ConnectionStateBanner } from '../../components/chat/ConnectionStateBanner';
import { Message } from '../../components/chat/Message';
import { MessageComposer } from '../../components/chat/MessageComposer';
import { MessageScroller } from '../../components/chat/MessageScroller';
import { TypingIndicator } from '../../components/chat/TypingIndicator';
import { StateView } from '../../components/StateView';
import { orderMessagePages, type MessagePages, updateMessageStatus, upsertMessage } from '../../features/chat/messageCache';
import { useSession } from '../../providers/SessionProvider';
import { api } from '../../services/api';
import { createChatSocket } from '../../services/socket';
import type { ApiEnvelope, Message as MessageType, Paginated, User } from '../../types/api';
import type { RootStackParamList } from '../../types/navigation';
import { styles } from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;
export function Chat({ route }: Props) {
  const { conversationId } = route.params;
  const session = useSession();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryKey = ['messages', conversationId] as const;
  const me = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get<ApiEnvelope<User>>('/api/v1/me')).data.data });
  const messages = useInfiniteQuery({
    queryKey,
    initialPageParam: '',
    queryFn: async ({ pageParam }) => (await api.get<ApiEnvelope<Paginated<MessageType>>>('/api/v1/conversations/' + conversationId + '/messages', { params: { limit: 30, cursor: pageParam || undefined } })).data.data,
    getNextPageParam: (lastPage) => lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.nextCursor || undefined : undefined
  });

  useEffect(() => {
    let active = true;
    let current: Socket | null = null;

    setConnectionState('connecting');
    createChatSocket({ getToken: session.getToken, devUserId: session.devUserId }).then((created) => {
      if (!active) return created.close();
      current = created;
      setSocket(created);
      created.on('connect', () => {
        setConnectionState('connected');
        created.emit('conversation:join', { conversationId });
        created.emit('message:read', { conversationId });
        void queryClient.invalidateQueries({ queryKey });
      });
      created.on('connect_error', () => setConnectionState('offline'));
      created.on('disconnect', () => {
        setConnectionState('offline');
        setOtherUserTyping(false);
      });
      created.on('presence:typing', (payload: { conversationId: string; userId: string; isTyping: boolean }) => {
        if (payload.conversationId === conversationId && payload.userId !== me.data?.id) setOtherUserTyping(payload.isTyping);
      });
      created.on('message:ack', (payload: { clientMessageId: string }) => {
        queryClient.setQueryData<MessagePages>(queryKey, (old) => updateMessageStatus(old, payload.clientMessageId, 'sent'));
      });
      created.on('message:created', (message: MessageType) => {
        queryClient.setQueryData<MessagePages>(queryKey, (old) => upsertMessage(old, { ...message, localStatus: 'sent' }));
      });
      created.connect();
    }).catch(() => setConnectionState('offline'));

    return () => {
      active = false;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      current?.close();
    };
  }, [conversationId, me.data?.id, queryClient, session.devUserId, session.getToken]);

  const ordered = useMemo(() => orderMessagePages(messages.data), [messages.data]);

  function setStatus(clientMessageId: string, status: NonNullable<MessageType['localStatus']>) {
    queryClient.setQueryData<MessagePages>(queryKey, (old) => updateMessageStatus(old, clientMessageId, status));
  }

  async function deliver(message: MessageType) {
    setStatus(message.clientMessageId, 'sending');
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
        setStatus(message.clientMessageId, 'sent');
      } else {
        const saved = (await api.post<ApiEnvelope<MessageType>>('/api/v1/conversations/' + conversationId + '/messages', { clientMessageId: message.clientMessageId, body: message.body })).data.data;
        queryClient.setQueryData<MessagePages>(queryKey, (old) => upsertMessage(old, { ...saved, localStatus: 'sent' }));
      }
    } catch {
      queryClient.setQueryData<MessagePages>(queryKey, (old) => {
        const current = old?.pages.flatMap((page) => page.items).find((item) => item.clientMessageId === message.clientMessageId);
        return current?.localStatus === 'sent' ? old : updateMessageStatus(old, message.clientMessageId, 'failed');
      });
    }
  }

  function send() {
    const text = body.trim();
    if (!text || !me.data) return;
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
    queryClient.setQueryData<MessagePages>(queryKey, (old) => upsertMessage(old, optimistic));
    void deliver(optimistic);
  }

  function stopTyping() {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = null;
    socket?.emit('presence:typing', { conversationId, isTyping: false });
  }

  function changeBody(value: string) {
    setBody(value);
    if (!socket?.connected || !value.trim()) {
      stopTyping();
      return;
    }
    socket.emit('presence:typing', { conversationId, isTyping: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 1200);
  }

  if (messages.isLoading) return <View style={styles.page}><StateView loading title="Carregando conversa" /></View>;
  if (messages.isError) return <View style={styles.page}><StateView title="Não foi possível carregar a conversa" icon="cloud-off" actionLabel="Tentar novamente" onAction={() => messages.refetch()} /></View>;

  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}><ConnectionStateBanner state={connectionState} /><MessageScroller>{messages.hasNextPage ? <Pressable accessibilityRole="button" disabled={messages.isFetchingNextPage} onPress={() => messages.fetchNextPage()} style={styles.older}><Text style={styles.olderText}>{messages.isFetchingNextPage ? 'Carregando…' : 'Carregar mensagens anteriores'}</Text></Pressable> : null}{ordered.length ? ordered.map((message) => <Message key={message.id} message={message} currentUserId={me.data?.id} onRetry={deliver} />) : <StateView title="Comece a conversa" description="Um oi e uma proposta clara são um ótimo começo." icon="waving-hand" />}{otherUserTyping ? <TypingIndicator /> : null}</MessageScroller><MessageComposer value={body} disabled={!me.data} onChangeText={changeBody} onBlur={stopTyping} onSend={send} /></KeyboardAvoidingView>;
}
