import { Fragment } from 'react';
import { Text, View } from 'react-native';
import { styles } from './styles';

export type ProfileMetric = { value: number; label: string; accessibilityLabel: string };
type Props = { metrics: ProfileMetric[] };

export function ProfileMetricRow({ metrics }: Props) {
  return (
    <View style={styles.row}>
      {metrics.map((metric, index) => (
        <Fragment key={metric.label}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View accessible accessibilityLabel={metric.accessibilityLabel} style={styles.metric}>
            <Text style={styles.value}>{metric.value}</Text>
            <Text style={styles.label}>{metric.label}</Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}
