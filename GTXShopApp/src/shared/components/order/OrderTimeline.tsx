import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';
import { TimelineStep } from '@shared/utils/orderStatusUtils';

interface OrderTimelineProps {
  steps: TimelineStep[];
  showTimestamps?: boolean;
}

const OrderTimeline: React.FC<OrderTimelineProps> = ({ steps, showTimestamps = true }) => {
  const { colors } = useTheme();

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isCompleted = step.completed;
        const isInProgress = step.inProgress;

        return (
          <View key={index} style={styles.stepContainer}>
            {/* Timeline Line */}
            {!isLast && (
              <View
                style={[
                  styles.line,
                  {
                    backgroundColor: isCompleted ? '#4CAF50' : colors.border,
                  },
                ]}
              />
            )}

            {/* Icon Circle */}
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isCompleted
                    ? '#4CAF50'
                    : isInProgress
                    ? '#FF9800'
                    : colors.background,
                  borderColor: isCompleted ? '#4CAF50' : isInProgress ? '#FF9800' : colors.border,
                },
              ]}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : isInProgress ? (
                <Ionicons name="time" size={16} color="#fff" />
              ) : (
                <View style={styles.emptyCircle} />
              )}
            </View>

            {/* Step Content */}
            <View style={styles.stepContent}>
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: isCompleted || isInProgress ? colors.text : colors.subText,
                    fontWeight: isInProgress ? 'bold' : 'normal',
                  },
                ]}
              >
                {step.label}
              </Text>
              {showTimestamps && step.timestamp && (
                <Text style={[styles.timestamp, { color: colors.subText }]}>
                  {formatTimestamp(step.timestamp)}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  line: {
    position: 'absolute',
    left: 11,
    top: 24,
    width: 2,
    height: 40,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    zIndex: 1,
  },
  emptyCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
  },
});

export default OrderTimeline;

