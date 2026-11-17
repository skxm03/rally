import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UserProfile } from '../types/user';
import { theme } from '../theme';

interface UserCardProps {
  user: UserProfile;
  onPress: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.headerRow}>
        <View style={styles.textBlock}>
          <Text style={styles.displayName}>
            {user.displayName || user.username}
          </Text>
          <Text style={styles.username}>@{user.username}</Text>
        </View>

        <View style={styles.karmaBox}>
          <Text style={styles.karmaLabel}>Karma</Text>
          <Text style={styles.karmaValue}>{user.karma}</Text>
        </View>
      </View>

      {user.bio ? (
        <Text style={styles.bio} numberOfLines={2}>
          {user.bio}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textBlock: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  displayName: {
    ...theme.typography.title,
    fontSize: 16,
    color: theme.colors.ink,
  },
  username: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
    marginTop: 1,
  },
  karmaBox: {
    alignItems: 'flex-end',
  },
  karmaLabel: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.inkSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  karmaValue: {
    ...theme.typography.title,
    fontSize: 15,
    color: theme.colors.ink,
  },
  bio: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.inkSecondary,
    lineHeight: 18,
    marginTop: 6,
  },
});
