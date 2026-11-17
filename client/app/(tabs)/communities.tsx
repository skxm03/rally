import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { CommunityCard } from '../../src/components/CommunityCard';
import { communityApi } from '../../src/api/communities';
import { Community } from '../../src/types/community';
import { theme } from '../../src/theme';

export default function CommunitiesScreen() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCommunities = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setIsLoading(true);
      setErrorMessage(null);

      const list = await communityApi.getCommunities();
      setCommunities(list);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to load communities.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCommunities(true);
  };

  const handleMembershipChange = (communityId: number, isMember: boolean, newCount: number) => {
    setCommunities((prev) =>
      prev.map((c) => (c.id === communityId ? { ...c, isMember, memberCount: newCount } : c))
    );
  };

  const filteredCommunities = communities.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q));
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Explore</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/community/create')}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={16} color={theme.colors.primaryContrast} />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={theme.colors.inkSubtle} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Filter communities..."
            placeholderTextColor={theme.colors.inkSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Main List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={theme.colors.ink} />
        </View>
      ) : errorMessage && communities.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Failed to load</Text>
          <Text style={styles.errorSubtitle}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchCommunities()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredCommunities}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <CommunityCard
              community={item}
              onPress={() => router.push(`/community/${item.name}`)}
              onMembershipChange={(isMember, newCount) =>
                handleMembershipChange(item.id, isMember, newCount)
              }
            />
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
              <Text style={styles.emptyTitle}>
                {searchQuery.trim() ? 'No matches found' : 'No communities yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery.trim()
                  ? `No community matches "${searchQuery}".`
                  : 'Be the first to start a community for your topic.'}
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
    paddingBottom: theme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  pageTitle: {
    ...theme.typography.hero,
    fontSize: 24,
    color: theme.colors.ink,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  createButtonText: {
    ...theme.typography.captionMedium,
    color: theme.colors.primaryContrast,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.md,
    height: 38,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: theme.colors.ink,
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
