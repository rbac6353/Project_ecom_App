import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';

interface AppTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

export default function AppTextInput({
  label,
  error,
  icon,
  isPassword = false,
  containerStyle,
  style,
  ...textInputProps
}: AppTextInputProps) {
  const { colors } = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const hasError = !!error;
  const borderColor = hasError ? '#FF6B6B' : colors.inputBorder || colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}
      
      <View
        style={[
          styles.inputContainer,
          {
            borderColor,
            backgroundColor: colors.inputBg || colors.card,
          },
          hasError && styles.inputContainerError,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={hasError ? '#FF6B6B' : colors.subText}
            style={styles.icon}
          />
        )}
        
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              flex: 1,
            },
            icon && styles.inputWithIcon,
            isPassword && styles.inputWithPassword,
            style,
          ]}
          placeholderTextColor={colors.placeholder || colors.subText}
          secureTextEntry={isPassword && !isPasswordVisible}
          {...textInputProps}
        />
        
        {isPassword && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.passwordToggle}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.subText}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {hasError && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  inputContainerError: {
    borderColor: '#FF6B6B',
  },
  icon: {
    marginRight: 12,
  },
  input: {
    fontSize: 16,
    paddingVertical: 12,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  inputWithPassword: {
    paddingRight: 0,
  },
  passwordToggle: {
    padding: 4,
    marginLeft: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
});

