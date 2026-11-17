import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Community } from '../types/community';
import { communityApi } from '../api/communities';
import { theme } from '../theme';

interface CommunityCardProps {
  community: Community;
  onPress: () => void;
  onMembershipChange?: (isMember: boolean, newMemberCount: number) => void;
}

export const CommunityCard: React.FC<CommunityCardProps> = ({
  community,
  onPress,
  onMembershipChange,
}) => {
  const [isMember, setIsMember] = useState(community.isMember);
  const [memberCount, setMemberCount] = useState(community.memberCount);
  const [isUpdating, setIsUpdating] = useState(false);

  React.useEffect(() => {
    setIsMember(community.isMember);
    setMemberCount(community.memberCount);
  }, [community.isMember, community.memberCount]);

  const handleToggleMembership = async () => {
    if (isUpdating) return;

    const previousIsMember = isMember;
    const previousCount = memberCount;

    // Optimistic state transition
    const nextIsMember = !previousIsMember;
    const nextCount = nextIsMember ? previousCount + 1 : Math.max(0, previousCount - 1);

    setIsMember(nextIsMember);
    setMemberCount(nextCount);
    onMembershipChange?.(nextIsMember, nextCount);
    setIsUpdating(true);

    try {
      if (previousIsMember) {
        await communityApi.leaveCommunity(community.id);
      } else {
        await communityApi.joinCommunity(community.id);
      }
    } catch (err: any) {
      // Rollback
      setIsMember(previousIsMember);
      setMemberCount(previousCount);
      onMembershipChange?.(previousIsMember, previousCount);

      if (err.status === 401) {
        Alert.alert('Sign in required', 'Please sign in to join communities.');
      } else {
        Alert.alert('Membership error', err.message || 'Failed to update membership.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.headerRow}>
        <View style={styles.nameBlock}>
          <Text style={styles.name}>c/{community.name}</Text>
          <Text style={styles.memberCount}>
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.actionButton, isMember ? styles.buttonJoined : styles.buttonJoin]}
          onPress={handleToggleMembership}
          disabled={isUpdating}
          activeOpacity={0.8}
        >
          {isUpdating ? (
            <ActivityIndicator
              size="small"
              color={isMember ? theme.colors.ink : theme.colors.primaryContrast}
            />
          ) : (
            <Text style={[styles.actionButtonText, isMember ? styles.textJoined : styles.textJoin]}>
              {isMember ? 'Joined' : 'Join'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {community.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {community.description}
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
    marginBottom: 4,
  },
  nameBlock: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  name: {
    ...theme.typography.title,
    fontSize: 17,
    color: theme.colors.ink,
    marginBottom: 2,
  },
  memberCount: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
  description: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.inkSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  actionButton: {
    borderRadius: theme.radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonJoin: {
    backgroundColor: theme.colors.primary,
  },
  buttonJoined: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  actionButtonText: {
    ...theme.typography.captionMedium,
  },
  textJoin: {
    color: theme.colors.primaryContrast,
  },
  textJoined: {
    color: theme.colors.ink,
  },
});
