import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { searchApi } from '../../src/api/search';
import { SearchType } from '../../src/types/search';
import { Post } from '../../src/types/post';
import { Community } from '../../src/types/community';
import { UserProfile } from '../../src/types/user';
import { PostCard } from '../../src/components/PostCard';
import { CommunityCard } from '../../src/components/CommunityCard';
import { UserCard } from '../../src/components/UserCard';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { theme } from '../../src/theme';

export default function SearchScreen() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchType>('all');

  const [posts, setPosts] = useState<Post[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(
    async (query: string, type: SearchType) => {
      const clean = query.trim();
      if (!clean) {
        setPosts([]);
        setCommunities([]);
        setUsers([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        if (type === 'all') {
          const res = await searchApi.searchAll(clean);
          setPosts(res.posts);
          setCommunities(res.communities);
          setUsers(res.users);
        } else if (type === 'posts') {
          const res = await searchApi.searchPosts(clean);
          setPosts(res.posts);
          setCommunities([]);
          setUsers([]);
        } else if (type === 'communities') {
          const res = await searchApi.searchCommunities(clean);
          setCommunities(res.communities);
          setPosts([]);
          setUsers([]);
        } else if (type === 'users') {
          const res = await searchApi.searchUsers(clean);
          setUsers(res.users);
          setPosts([]);
          setCommunities([]);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Search failed.');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      performSearch(searchQuery, activeTab);
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery, activeTab, performSearch]);

  const hasAnyResults = posts.length > 0 || communities.length > 0 || users.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <ScreenHeader title="Search" borderBottom={false} />

      {/* Search Input & Filters */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Feather name="search" size={17} color={theme.colors.inkSubtle} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search Rally..."
            placeholderTextColor={theme.colors.inkSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color={theme.colors.inkSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tab Filters */}
        <View style={styles.tabRow}>
          {(['all', 'posts', 'communities', 'users'] as SearchType[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={theme.colors.ink} />
        </View>
      ) : !searchQuery.trim() ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyPromptTitle}>Search Rally</Text>
          <Text style={styles.emptyPromptSub}>Find posts, communities, and people by name or keyword.</Text>
        </View>
      ) : !hasAnyResults ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyPromptTitle}>No results</Text>
          <Text style={styles.emptyPromptSub}>No matches found for "{searchQuery}".</Text>
        </View>
      ) : activeTab === 'all' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Communities section */}
          {communities.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Communities</Text>
                <TouchableOpacity onPress={() => setActiveTab('communities')}>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              </View>
              {communities.map((c) => (
                <CommunityCard
                  key={c.id}
                  community={c}
                  onPress={() => router.push(`/community/${c.name}`)}
                />
              ))}
            </View>
          )}

          {/* Users section */}
          {users.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>People</Text>
                <TouchableOpacity onPress={() => setActiveTab('users')}>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              </View>
              {users.map((u) => (
                <UserCard
                  key={u.id}
                  user={u}
                  onPress={() => router.push(`/user/${u.username}`)}
                />
              ))}
            </View>
          )}

          {/* Posts section */}
          {posts.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Posts</Text>
                <TouchableOpacity onPress={() => setActiveTab('posts')}>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              </View>
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </View>
          )}
        </ScrollView>
      ) : activeTab === 'posts' ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <PostCard post={item} />}
        />
      ) : activeTab === 'communities' ? (
        <FlatList
          data={communities}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <CommunityCard
              community={item}
              onPress={() => router.push(`/community/${item.name}`)}
            />
          )}
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <UserCard
              user={item}
              onPress={() => router.push(`/user/${item.username}`)}
            />
          )}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.md,
    height: 38,
    marginBottom: theme.spacing.sm,
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
  tabRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingTop: 2,
  },
  tabButton: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: theme.radii.sm,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
  tabText: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
  tabTextActive: {
    color: theme.colors.ink,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: theme.spacing.hero,
  },
  sectionBlock: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  seeAllText: {
    ...theme.typography.captionMedium,
    color: theme.colors.inkSecondary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyPromptTitle: {
    ...theme.typography.title,
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
  },
  emptyPromptSub: {
    ...theme.typography.body,
    color: theme.colors.inkSecondary,
    textAlign: 'center',
  },
});
