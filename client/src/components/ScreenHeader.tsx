import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  onTitlePress?: () => void;
  rightAction?: React.ReactNode;
  borderBottom?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  onTitlePress,
  rightAction,
  borderBottom = true,
  style,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  // Stack sub-screen header (with back navigation)
  if (showBack) {
    return (
      <View style={[styles.navContainer, borderBottom && styles.borderBottom, style]}>
        <View style={styles.navLeft}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={theme.colors.ink} />
          </TouchableOpacity>

          {onTitlePress ? (
            <TouchableOpacity onPress={onTitlePress} activeOpacity={0.7} style={styles.navTitlePressable}>
              <Text style={styles.navTitle} numberOfLines={1}>
                {title}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.navTitle} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>

        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>
    );
  }

  // Top-level tab page header
  return (
    <View style={[styles.tabHeaderContainer, borderBottom && styles.borderBottom, style]}>
      <View style={styles.tabTitleCol}>
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>

      {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  // Sub-screen top nav (e.g. Community Detail, Edit Post, New Community, Post Detail)
  navContainer: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  navLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  backButton: {
    paddingRight: theme.spacing.md,
    paddingVertical: 4,
  },
  navTitlePressable: {
    flexShrink: 1,
  },
  navTitle: {
    ...theme.typography.navTitle,
    color: theme.colors.ink,
  },

  // Top-level tab header (e.g. Explore, Search, Profile, Create Post)
  tabHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  tabTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  pageTitle: {
    ...theme.typography.pageTitle,
    color: theme.colors.ink,
  },
  pageSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
    marginTop: 2,
  },

  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
});
