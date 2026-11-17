import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { PostCard } from '../../src/components/PostCard';
import { Button } from '../../src/components/Button';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { communityApi } from '../../src/api/communities';
import { Community } from '../../src/types/community';
import { Post, FeedSort } from '../../src/types/post';
import { theme } from '../../src/theme';

export default function CommunityDetailScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<FeedSort>('new');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [isLoadingCommunity, setIsLoadingCommunity] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isTogglingMember, setIsTogglingMember] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch community metadata
  const fetchCommunityInfo = useCallback(async () => {
    if (!name) return;
    try {
      setIsLoadingCommunity(true);
      const data = await communityApi.getCommunityByName(name);
      setCommunity(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load community.');
    } finally {
      setIsLoadingCommunity(false);
    }
  }, [name]);

  // Fetch community posts
  const fetchCommunityPosts = useCallback(
    async (targetPage = 1, isRefresh = false) => {
      if (!name) return;
      try {
        if (targetPage === 1 && !isRefresh) {
          setIsLoadingPosts(true);
        }

        const response = await communityApi.getCommunityPosts(name, {
          sort,
          page: targetPage,
          limit: 15,
        });

        if (targetPage === 1) {
          setPosts(response.posts);
        } else {
          setPosts((prev) => [...prev, ...response.posts]);
        }

        setPage(response.pagination.page);
        setHasMore(response.pagination.hasMore);
      } catch (err: any) {
        if (targetPage === 1) {
          setErrorMessage(err.message || 'Failed to load posts.');
        }
      } finally {
        setIsLoadingPosts(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [name, sort]
  );

  useEffect(() => {
    fetchCommunityInfo();
  }, [fetchCommunityInfo]);

  useEffect(() => {
    fetchCommunityPosts(1);
  }, [fetchCommunityPosts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCommunityInfo();
    fetchCommunityPosts(1, true);
  };

  const handleLoadMore = () => {
    if (!hasMore || isLoadingPosts || isLoadingMore || isRefreshing) return;
    setIsLoadingMore(true);
    fetchCommunityPosts(page + 1);
  };

  const handleToggleMembership = async () => {
    if (!community || isTogglingMember) return;

    const previousIsMember = community.isMember;
    const previousCount = community.memberCount;
    const nextIsMember = !previousIsMember;
    const nextCount = nextIsMember ? previousCount + 1 : Math.max(0, previousCount - 1);

    setCommunity((prev) =>
      prev ? { ...prev, isMember: nextIsMember, memberCount: nextCount } : prev
    );
    setIsTogglingMember(true);

    try {
      if (previousIsMember) {
        await communityApi.leaveCommunity(community.id);
      } else {
        await communityApi.joinCommunity(community.id);
      }
    } catch (err: any) {
      setCommunity((prev) =>
        prev ? { ...prev, isMember: previousIsMember, memberCount: previousCount } : prev
      );
      if (err.status === 401) {
        Alert.alert('Sign in required', 'Please sign in to join communities.');
      } else {
        Alert.alert('Membership error', err.message || 'Action could not be completed.');
      }
    } finally {
      setIsTogglingMember(false);
    }
  };

  const handleVoteChange = (postId: number, newScore: number, newUserVote: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, score: newScore, userVote: newUserVote } : p))
    );
  };

  const renderHeader = () => {
    if (!community) return null;

    return (
      <View style={styles.communityHeader}>
        <View style={styles.headerInfoRow}>
          <View style={styles.headerTextCol}>
            <Text style={styles.communityTitle}>c/{community.name}</Text>
            <Text style={styles.memberCount}>
              {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Button
              title={community.isMember ? 'Joined' : 'Join'}
              variant={community.isMember ? 'secondary' : 'primary'}
              size="sm"
              loading={isTogglingMember}
              onPress={handleToggleMembership}
            />

            <Button
              title="Post"
              variant="secondary"
              size="sm"
              icon={<Feather name="plus" size={14} color={theme.colors.ink} />}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/create',
                  params: {
                    communityId: String(community.id),
                    communityName: community.name,
                  },
                })
              }
            />
          </View>
        </View>

        {community.description ? (
          <Text style={styles.communityDescription}>{community.description}</Text>
        ) : null}

        {/* Sort Bar */}
        <View style={styles.sortRow}>
          {(['new', 'top', 'trending'] as FeedSort[]).map((sortOption) => {
            const isActive = sort === sortOption;
            return (
              <TouchableOpacity
                key={sortOption}
                style={[styles.sortButton, isActive && styles.sortButtonActive]}
                onPress={() => {
                  if (sort !== sortOption) setSort(sortOption);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.sortText, isActive && styles.sortTextActive]}>
                  {sortOption.charAt(0).toUpperCase() + sortOption.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  if (isLoadingCommunity && !community) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title={`c/${name || '...'}`} showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={theme.colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage && !community) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title={`c/${name || '...'}`} showBack />
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Community Not Found</Text>
          <Text style={styles.errorSubtitle}>{errorMessage}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Back Top Nav */}
      <ScreenHeader title={`c/${name}`} showBack />

      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onVoteChange={(score, vote) => handleVoteChange(item.id, score, vote)}
            onDelete={() => setPosts((prev) => prev.filter((p) => p.id !== item.id))}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.ink}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.colors.inkSecondary} />
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          !isLoadingPosts ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySubtitle}>
                This community does not have any posts under this sort order.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="small" color={theme.colors.inkSecondary} />
            </View>
          )
        }
      />
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
  communityHeader: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  headerTextCol: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  communityTitle: {
    ...theme.typography.hero,
    fontSize: 22,
    color: theme.colors.ink,
    marginBottom: 2,
  },
  memberCount: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
  communityDescription: {
    ...theme.typography.body,
    color: theme.colors.ink,
    lineHeight: 21,
    marginBottom: theme.spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  joinButton: {
    borderRadius: theme.radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonJoin: {
    backgroundColor: theme.colors.primary,
  },
  buttonJoined: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  joinButtonText: {
    ...theme.typography.captionMedium,
  },
  textJoin: {
    color: theme.colors.primaryContrast,
  },
  textJoined: {
    color: theme.colors.ink,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  postButtonText: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
  },
  sortRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  sortButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radii.sm,
  },
  sortButtonActive: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
  sortText: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
  sortTextActive: {
    color: theme.colors.ink,
    fontWeight: '600',
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
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: theme.spacing.hero,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...theme.typography.title,
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: theme.colors.inkSecondary,
    textAlign: 'center',
  },
});
