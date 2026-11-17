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
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostCard } from '../../src/components/PostCard';
import { feedApi } from '../../src/api/feed';
import { Post, FeedSort, FeedType } from '../../src/types/post';
import { theme } from '../../src/theme';

export default function FeedScreen() {
  const [feedType, setFeedType] = useState<FeedType>('home');
  const [feedSort, setFeedSort] = useState<FeedSort>('new');

  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchFeed = useCallback(
    async (targetPage = 1, isRefresh = false) => {
      try {
        if (targetPage === 1 && !isRefresh) {
          setIsLoading(true);
        }
        setErrorMessage(null);

        const response =
          feedType === 'popular'
            ? await feedApi.getPopularFeed({ sort: feedSort, page: targetPage, limit: 15 })
            : await feedApi.getFeed({ type: 'home', sort: feedSort, page: targetPage, limit: 15 });

        if (targetPage === 1) {
          setPosts(response.posts);
        } else {
          setPosts((prev) => [...prev, ...response.posts]);
        }

        setPage(response.pagination.page);
        setHasMore(response.pagination.hasMore);
      } catch (err: any) {
        setErrorMessage(err.message || 'Unable to load feed.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [feedType, feedSort]
  );

  useEffect(() => {
    fetchFeed(1);
  }, [fetchFeed]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchFeed(1, true);
  };

  const handleLoadMore = () => {
    if (!hasMore || isLoading || isLoadingMore || isRefreshing) return;
    setIsLoadingMore(true);
    fetchFeed(page + 1);
  };

  const handleVoteChange = (postId: number, newScore: number, newUserVote: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, score: newScore, userVote: newUserVote } : p))
    );
  };

  const renderSortOption = (sortOption: FeedSort, label: string) => {
    const isActive = feedSort === sortOption;
    return (
      <TouchableOpacity
        key={sortOption}
        style={[styles.sortButton, isActive && styles.sortButtonActive]}
        onPress={() => {
          if (feedSort !== sortOption) {
            setFeedSort(sortOption);
          }
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.sortText, isActive && styles.sortTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.brandTitle}>Rally</Text>
        </View>

        {/* Home / Popular Segmented Switch */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentTab, feedType === 'home' && styles.segmentTabActive]}
            onPress={() => {
              if (feedType !== 'home') setFeedType('home');
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentLabel,
                feedType === 'home' && styles.segmentLabelActive,
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, feedType === 'popular' && styles.segmentTabActive]}
            onPress={() => {
              if (feedType !== 'popular') setFeedType('popular');
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentLabel,
                feedType === 'popular' && styles.segmentLabelActive,
              ]}
            >
              Popular
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sort Filter Row */}
        <View style={styles.sortRow}>
          {renderSortOption('new', 'New')}
          {renderSortOption('top', 'Top')}
          {renderSortOption('trending', 'Trending')}
        </View>
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={theme.colors.ink} />
        </View>
      ) : errorMessage && posts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Feed Unavailable</Text>
          <Text style={styles.errorSubtitle}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchFeed(1)}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onVoteChange={(score, vote) => handleVoteChange(item.id, score, vote)}
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
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {feedType === 'home' ? 'No posts in your feed' : 'No posts found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {feedType === 'home'
                  ? 'Join communities to see posts here, or switch to Popular to explore global discussions.'
                  : 'Check back soon for new community posts.'}
              </Text>
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
  header: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  titleRow: {
    marginBottom: theme.spacing.sm,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.sm,
    padding: 3,
    marginBottom: theme.spacing.sm,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.sm - 1,
  },
  segmentTabActive: {
    backgroundColor: theme.colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  segmentLabel: {
    ...theme.typography.captionMedium,
    color: theme.colors.inkSecondary,
  },
  segmentLabelActive: {
    color: theme.colors.ink,
    fontWeight: '600',
  },
  sortRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingTop: 2,
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
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.xl,
  },
  retryButtonText: {
    ...theme.typography.captionMedium,
    color: theme.colors.primaryContrast,
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
    lineHeight: 22,
  },
});
