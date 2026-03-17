import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/providers/ThemeContext';

interface TimelineProgressBarProps {
    currentStep: number; // 0-based index of current step
    totalSteps: number;
    currentLabel: string;
    timestamp?: string;
    onPress?: () => void;
}

const TimelineProgressBar: React.FC<TimelineProgressBarProps> = ({
    currentStep,
    totalSteps,
    currentLabel,
    timestamp,
    onPress,
}) => {
    const { colors } = useTheme();
    const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: '#E8F5E9' }]}
            onPress={onPress}
            activeOpacity={0.7}
            disabled={!onPress}
        >
            <View style={styles.content}>
                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { width: `${progress}%` },
                            ]}
                        />
                    </View>
                    {/* Step Dots */}
                    <View style={styles.dotsContainer}>
                        {Array.from({ length: totalSteps }).map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    index <= currentStep && styles.dotCompleted,
                                ]}
                            />
                        ))}
                    </View>
                </View>

                {/* Label and Timestamp */}
                <View style={styles.labelContainer}>
                    <Text style={[styles.label, { color: '#4CAF50' }]}>
                        {currentLabel}
                    </Text>
                    {timestamp && (
                        <Text style={[styles.timestamp, { color: '#666' }]}>
                            {timestamp}
                        </Text>
                    )}
                </View>
            </View>

            {/* Arrow Icon */}
            {onPress && (
                <Ionicons name="chevron-forward" size={20} color="#4CAF50" />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginVertical: 8,
    },
    content: {
        flex: 1,
    },
    progressBarContainer: {
        position: 'relative',
        height: 24,
        justifyContent: 'center',
    },
    progressBarBackground: {
        height: 4,
        backgroundColor: '#C8E6C9',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 2,
    },
    dotsContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#C8E6C9',
        borderWidth: 2,
        borderColor: '#fff',
    },
    dotCompleted: {
        backgroundColor: '#4CAF50',
    },
    labelContainer: {
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    timestamp: {
        fontSize: 12,
    },
});

export default TimelineProgressBar;
