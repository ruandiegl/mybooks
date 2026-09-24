import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';
import { passwordIssues, PASSWORD_REQUIREMENTS } from '../../features/auth/passwordRules';
import { theme } from '../../styles/theme';
import { styles } from './styles';

export function PasswordRequirements({ password }: { password: string }) {
  const issues = passwordIssues(password);

  return (
    <View accessibilityLabel="Requisitos da senha" style={styles.list}>
      {PASSWORD_REQUIREMENTS.map((requirement) => {
        const complete = !issues.includes(requirement);
        return (
          <View key={requirement} style={styles.item}>
            <MaterialIcons
              name={complete ? 'check-circle' : 'radio-button-unchecked'}
              size={16}
              color={complete ? theme.colors.success : theme.colors.mutedForeground}
            />
            <Text style={[styles.label, complete && styles.complete]}>{requirement.replace('A senha deve ', '')}</Text>
          </View>
        );
      })}
    </View>
  );
}
