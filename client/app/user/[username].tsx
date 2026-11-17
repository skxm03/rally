import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { userApi } from '../../src/api/users';
import { UserProfile } from '../../src/types/user';
import { Post } from '../../src/types/post';
import { PostCard } from '../../src/components/PostCard';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { formatRelativeTime } from '../../src/utils/date';
import { theme } from '../../src/theme';

export default function UserProfileScreen() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchProfile = useCallback(
    async (isRefresh = false) => {
      if (!username) return;
      try {
        if (!isRefresh) setIsLoading(true);
        setErrorMessage(null);

        const data = await userApi.getUserProfile(username);
        setProfile(data.user);
        setPosts(data.posts || []);
        setComments(data.comments || []);
      } catch (err: any) {
        setErrorMessage(err.message || 'User not found.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [username]
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchProfile(true);
  };

  const renderHeader = () => {
    if (!profile) return null;

    const formattedJoinDate = profile.createdAt
      ? new Date(profile.createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
        })
      : null;

    return (
      <View style={styles.profileHeader}>
        <View style={styles.nameBlock}>
          <Text style={styles.displayName}>{profile.displayName || profile.username}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
        </View>

        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Karma</Text>
            <Text style={styles.statValue}>{profile.karma}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Joined</Text>
            <Text style={styles.statValueSmall}>{formattedJoinDate || 'Recent'}</Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'posts' && styles.tabButtonActive]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
              Posts ({posts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'comments' && styles.tabButtonActive]}
            onPress={() => setActiveTab('comments')}
          >
            <Text style={[styles.tabText, activeTab === 'comments' && styles.tabTextActive]}>
              Comments ({comments.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading && !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title={`u/${username || '...'}`} showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={theme.colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage && !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title={`u/${username || '...'}`} showBack />
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Profile Not Found</Text>
          <Text style={styles.errorSubtitle}>{errorMessage}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title={`u/${username}`} showBack />

      {activeTab === 'posts' ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => <PostCard post={item} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.ink}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No posts yet.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              <View style={styles.commentMeta}>
                <Text style={styles.commentPostTitle}>
                  on {item.post_title || 'post'}
                </Text>
                <Text style={styles.commentTime}>
                  · {formatRelativeTime(item.created_at)}
                </Text>
              </View>
              <Text style={styles.commentBody}>{item.content}</Text>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.ink}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No comments yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  topNavTitle: {
    ...theme.typography.title,
    fontSize: 16,
    color: theme.colors.ink,
  },
  profileHeader: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  nameBlock: {
    marginBottom: 6,
  },
  displayName: {
    ...theme.typography.hero,
    fontSize: 22,
    color: theme.colors.ink,
  },
  username: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
    marginTop: 1,
  },
  bio: {
    ...theme.typography.body,
    color: theme.colors.ink,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  statLabel: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.inkSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statValue: {
    ...theme.typography.title,
    fontSize: 16,
    color: theme.colors.ink,
  },
  statValueSmall: {
    ...theme.typography.bodyMedium,
    color: theme.colors.ink,
  },
  tabRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.ink,
  },
  tabText: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
  tabTextActive: {
    color: theme.colors.ink,
    fontWeight: '600',
  },
  commentRow: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentPostTitle: {
    ...theme.typography.captionMedium,
    color: theme.colors.inkSecondary,
  },
  commentTime: {
    ...theme.typography.caption,
    color: theme.colors.inkSubtle,
  },
  commentBody: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.ink,
    lineHeight: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  errorTitle: {
    ...theme.typography.title,
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
  },
  errorSubtitle: {
    ...theme.typography.body,
    color: theme.colors.inkSecondary,
  },
  emptyContainer: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.inkSecondary,
  },
});
