import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Post } from '../types/post';
import { postApi } from '../api/posts';
import { api } from '../api/client';
import { formatRelativeTime } from '../utils/date';
import { theme } from '../theme';

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onVoteChange?: (newScore: number, newUserVote: number) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onPress, onVoteChange }) => {
  const [currentScore, setCurrentScore] = useState(post.score);
  const [currentUserVote, setCurrentUserVote] = useState(post.userVote);
  const [isVoting, setIsVoting] = useState(false);

  // Sync state if post prop updates externally
  React.useEffect(() => {
    setCurrentScore(post.score);
    setCurrentUserVote(post.userVote);
  }, [post.score, post.userVote]);

  const handleVote = async (targetVote: 1 | -1) => {
    if (isVoting) return;

    const previousScore = currentScore;
    const previousVote = currentUserVote;

    // Calculate optimistic transition
    let optimisticVote: 1 | -1 | 0 = targetVote;
    let delta = 0;

    if (previousVote === targetVote) {
      // Toggle off / remove vote
      optimisticVote = 0;
      delta = -targetVote;
    } else if (previousVote === 0) {
      delta = targetVote;
    } else {
      // Switching from +1 to -1 or -1 to +1
      delta = targetVote * 2;
    }

    const nextScore = previousScore + delta;
    setCurrentScore(nextScore);
    setCurrentUserVote(optimisticVote);
    onVoteChange?.(nextScore, optimisticVote);
    setIsVoting(true);

    try {
      const response = await postApi.votePost(post.id, targetVote);
      setCurrentScore(response.score);
      setCurrentUserVote(response.voteValue);
      onVoteChange?.(response.score, response.voteValue);
    } catch (err: any) {
      // Rollback on failure
      setCurrentScore(previousScore);
      setCurrentUserVote(previousVote);
      onVoteChange?.(previousScore, previousVote);

      if (err.status === 401) {
        Alert.alert('Sign in required', 'Please sign in to vote on posts.');
      } else {
        Alert.alert('Vote failed', err.message || 'Could not record vote.');
      }
    } finally {
      setIsVoting(false);
    }
  };

  const resolvedImageUrl = api.getMediaUrl(post.imageUrl);
  const communityName = post.community?.name || 'community';
  const authorName = post.author?.displayName || post.author?.username || 'anonymous';
  const relativeTime = formatRelativeTime(post.createdAt);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      {/* Context line: Community, author, time */}
      <View style={styles.metaRow}>
        <Text style={styles.communityName}>c/{communityName}</Text>
        <Text style={styles.metaDivider}>·</Text>
        <Text style={styles.authorName}>u/{authorName}</Text>
        {relativeTime ? (
          <>
            <Text style={styles.metaDivider}>·</Text>
            <Text style={styles.timeText}>{relativeTime}</Text>
          </>
        ) : null}
      </View>

      {/* Post Title */}
      <Text style={styles.title}>{post.title}</Text>

      {/* Text Excerpt (if available) */}
      {post.content ? (
        <Text style={styles.content} numberOfLines={3}>
          {post.content}
        </Text>
      ) : null}

      {/* Post Image (if available) */}
      {resolvedImageUrl ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: resolvedImageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        </View>
      ) : null}

      {/* Actions row: Vote controls and Comments */}
      <View style={styles.actionsRow}>
        <View style={styles.voteContainer}>
          <TouchableOpacity
            style={styles.voteButton}
            onPress={() => handleVote(1)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Feather
              name="arrow-up"
              size={17}
              color={currentUserVote === 1 ? theme.colors.ink : theme.colors.inkSubtle}
            />
          </TouchableOpacity>

          <Text
            style={[
              styles.scoreText,
              currentUserVote === 1 && styles.scorePositive,
              currentUserVote === -1 && styles.scoreNegative,
            ]}
          >
            {currentScore}
          </Text>

          <TouchableOpacity
            style={styles.voteButton}
            onPress={() => handleVote(-1)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Feather
              name="arrow-down"
              size={17}
              color={currentUserVote === -1 ? theme.colors.error : theme.colors.inkSubtle}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.commentContainer}>
          <Feather name="message-square" size={15} color={theme.colors.inkSubtle} />
          <Text style={styles.commentCount}>
            {post.commentCount ?? 0} {post.commentCount === 1 ? 'comment' : 'comments'}
          </Text>
        </View>
      </View>
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  communityName: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
  },
  metaDivider: {
    ...theme.typography.caption,
    color: theme.colors.inkSubtle,
    marginHorizontal: 5,
  },
  authorName: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
  timeText: {
    ...theme.typography.caption,
    color: theme.colors.inkSubtle,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.ink,
    marginBottom: 6,
  },
  content: {
    ...theme.typography.body,
    color: theme.colors.inkSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 22,
  },
  imageContainer: {
    borderRadius: theme.radii.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
    height: 220,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xl,
    marginTop: 4,
  },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
  },
  voteButton: {
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
    minWidth: 18,
    textAlign: 'center',
  },
  scorePositive: {
    color: theme.colors.ink,
    fontWeight: '700',
  },
  scoreNegative: {
    color: theme.colors.error,
    fontWeight: '700',
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentCount: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
});
