import { Text, View } from 'react-native';
import type { Message as MessageType } from '../../../types/api';
import { Bubble } from '../Bubble';
import { DeliveryStatus } from '../DeliveryStatus';
import { styles } from './styles';
type Props = { message: MessageType; currentUserId?: string; onRetry?: (message: MessageType) => void };
export function Message({ message, currentUserId, onRetry }: Props) {
  const mine = message.senderId === currentUserId;
  return <View style={styles.row}>{!mine && message.sender?.name ? <Text style={styles.sender}>{message.sender.name}</Text> : null}<Bubble body={message.body} createdAt={message.createdAt} mine={mine} />{mine && message.localStatus ? <DeliveryStatus status={message.localStatus} onRetry={message.localStatus === 'failed' && onRetry ? () => onRetry(message) : undefined} /> : null}</View>;
}
